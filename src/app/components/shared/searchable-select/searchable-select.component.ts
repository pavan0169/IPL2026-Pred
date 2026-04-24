import { Component, Input, Output, EventEmitter, signal, computed, ElementRef, HostListener, forwardRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { DropdownOption } from '../../../models/ipl.models';

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
                [placeholder]="'Search player / role...'"
                [(ngModel)]="searchQuery" 
                (ngModelChange)="focusedIndex.set(0)"
                (keydown.arrowdown)="onArrowDown($event)"
                (keydown.arrowup)="onArrowUp($event)"
                (keydown.enter)="onEnter($event)"
              >
            </div>
          </div>
          
          <div class="options-list" #optionsList>
            @for (opt of filteredOptions(); track opt.value; let i = $index) {
              <div 
                class="option-item" 
                [class.selected]="opt.value === selectedValue()"
                [class.focused]="focusedIndex() === i"
                (click)="selectOption(opt)"
                (mouseenter)="focusedIndex.set(i)"
                [style.background]="getOptionBackground(opt, i)"
              >
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span>
                      {{ opt.label }}
                      @if (opt.suffix) {
                        <span style="color: #fbbf24; font-size: 0.75rem; margin-left: 0.4rem; font-weight: bold;">{{ opt.suffix }}</span>
                      }
                    </span>
                    @if (opt.badge) {
                        <span class="role-badge" [ngClass]="opt.badge.toLowerCase().replace(' ', '-')">{{ opt.badge }}</span>
                    }
                </div>
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

    .option-item:hover, .option-item.focused {
      background: rgba(139, 92, 246, 0.2);
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

    /* Role Badges */
    .role-badge {
        font-size: 0.65rem;
        font-weight: 700;
        padding: 0.2rem 0.45rem;
        border-radius: 10px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        background: rgba(255,255,255,0.1);
        color: #fff;
    }
    .batsman { background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); color: #93c5fd; }
    .bowler { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; }
    .all-rounder { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); color: #fcd34d; }
    .wicket-keeper { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #6ee7b7; }
  `]
})
export class SearchableSelectComponent implements ControlValueAccessor {
  @Input() options: DropdownOption[] = [];
  @Input() placeholder: string = 'Select an option';

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('optionsList') optionsList!: ElementRef<HTMLDivElement>;

  selectedValue = signal('');
  isOpen = signal(false);
  searchQuery = signal('');
  focusedIndex = signal(0);

  onChange: any = () => { };
  onTouched: any = () => { };

  filteredOptions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.options;
    return this.options.filter(opt => 
        opt.label.toLowerCase().includes(query) || 
        (opt.badge && opt.badge.toLowerCase().includes(query))
    );
  });

  getOptionBackground(opt: DropdownOption, index: number): string {
    if (opt.value === this.selectedValue()) {
      return opt.teamColor || '#8b5cf6';
    }
    if (this.focusedIndex() === index) {
      return opt.teamColor ? `${opt.teamColor}50` : 'rgba(139, 92, 246, 0.2)';
    }
    return opt.teamColor ? `${opt.teamColor}22` : '';
  }

  toggleDropdown() {
    this.isOpen.update(v => !v);
    if (this.isOpen()) {
      this.searchQuery.set('');
      this.focusedIndex.set(0);
      setTimeout(() => {
        this.searchInput?.nativeElement?.focus();
      });
    }
  }

  onArrowDown(event: Event) {
    event.preventDefault();
    if (this.focusedIndex() < this.filteredOptions().length - 1) {
      this.focusedIndex.update(v => v + 1);
      this.scrollToFocus();
    }
  }

  onArrowUp(event: Event) {
    event.preventDefault();
    if (this.focusedIndex() > 0) {
      this.focusedIndex.update(v => v - 1);
      this.scrollToFocus();
    }
  }

  onEnter(event: Event) {
    event.preventDefault();
    const opts = this.filteredOptions();
    if (opts.length > 0 && this.focusedIndex() >= 0 && this.focusedIndex() < opts.length) {
      this.selectOption(opts[this.focusedIndex()]);
    }
  }

  scrollToFocus() {
    setTimeout(() => {
      if (!this.optionsList) return;
      const container = this.optionsList.nativeElement;
      const activeEl = container.querySelector('.option-item.focused') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  selectOption(opt: DropdownOption) {
    this.selectedValue.set(opt.label);
    this.onChange(opt.value);
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
    if (!value) {
        this.selectedValue.set('');
        return;
    }
    const match = this.options?.find(o => o.value === value);
    this.selectedValue.set(match ? match.label : value);
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
