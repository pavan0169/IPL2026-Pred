import { Component, Input, Output, EventEmitter, signal, computed, ElementRef, HostListener, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="searchable-select-container" (click)="$event.stopPropagation()">
      <!-- Display / Trigger -->
      <div class="select-trigger" (click)="toggleDropdown()" [class.open]="isOpen()">
        <span class="trigger-text" [class.placeholder]="!selectedValue()">
          {{ selectedValue() || placeholder }}
        </span>
        <span class="chevron">▼</span>
      </div>

      <!-- Dropdown -->
      @if (isOpen()) {
        <div class="select-dropdown">
          <div class="search-box">
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input 
                #searchInput
                type="text" 
                class="search-input" 
                [placeholder]="'Search player...'"
                [(ngModel)]="searchQuery" 
                (keydown.enter)="$event.preventDefault()"
              >
            </div>
          </div>
          
          <div class="options-list">
            @for (opt of filteredOptions(); track opt) {
              <div 
                class="option-item" 
                [class.selected]="opt === selectedValue()"
                (click)="selectOption(opt)"
              >
                {{ opt }}
              </div>
            }
            @if (filteredOptions().length === 0) {
              <div class="no-results">No players found</div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .searchable-select-container {
      position: relative;
      width: 100%;
      font-family: inherit;
    }

    .select-trigger {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      background: var(--surface-v2, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 46px;
    }

    .select-trigger:hover {
      background: var(--surface-v3, rgba(255, 255, 255, 0.08));
      border-color: var(--accent-light, rgba(139, 92, 246, 0.3));
    }

    .select-trigger.open {
      border-color: var(--accent, #8b5cf6);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
    }

    .trigger-text {
      color: var(--text-primary, #fff);
      font-size: 0.95rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .trigger-text.placeholder {
      color: var(--text-muted, #888);
    }

    .chevron {
      font-size: 0.7rem;
      color: var(--text-muted);
      transition: transform 0.2s ease;
    }

    .open .chevron {
      transform: rotate(180deg);
    }

    .select-dropdown {
      position: absolute;
      top: calc(100% + 5px);
      left: 0;
      width: 100%;
      background: #1a1a1a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      overflow: hidden;
      animation: dropdownSlide 0.2s ease;
    }

    @keyframes dropdownSlide {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .search-box {
      padding: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(0, 0, 0, 0.2);
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      font-size: 0.8rem;
      opacity: 0.5;
    }

    .search-input {
      width: 100%;
      padding: 0.6rem 0.85rem 0.6rem 2.1rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #fff;
      font-size: 0.9rem;
      outline: none;
    }

    .search-input:focus {
      border-color: #8b5cf6;
    }

    .options-list {
      max-height: 250px;
      overflow-y: auto;
      padding: 0.35rem;
    }

    .options-list::-webkit-scrollbar {
      width: 5px;
    }
    .options-list::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }

    .option-item {
      padding: 0.65rem 0.85rem;
      border-radius: 7px;
      cursor: pointer;
      color: #ccc;
      font-size: 0.9rem;
      transition: all 0.15s ease;
    }

    .option-item:hover {
      background: rgba(139, 92, 246, 0.1);
      color: #fff;
    }

    .option-item.selected {
      background: #8b5cf6;
      color: #fff;
    }

    .no-results {
      padding: 2rem 1rem;
      text-align: center;
      color: #888;
      font-size: 0.85rem;
    }
  `]
})
export class SearchableSelectComponent implements ControlValueAccessor {
  @Input() options: string[] = [];
  @Input() placeholder: string = 'Select an option';

  selectedValue = signal('');
  isOpen = signal(false);
  searchQuery = signal('');

  onChange: any = () => { };
  onTouched: any = () => { };

  filteredOptions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.options;
    return this.options.filter(opt => opt.toLowerCase().includes(query));
  });

  toggleDropdown() {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.searchQuery.set('');
    }
  }

  selectOption(opt: string) {
    this.selectedValue.set(opt);
    this.onChange(opt);
    this.onTouched();
    this.isOpen.set(false);
  }

  constructor() { }

  @HostListener('document:click')
  closeDropdown() {
    this.isOpen.set(false);
  }

  // ControlValueAccessor methods
  writeValue(value: any): void {
    this.selectedValue.set(value || '');
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    // Handle disabled state if needed
  }
}
