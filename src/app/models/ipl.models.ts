export interface Team {
    id: string;
    name: string;
    shortName: string;
    color: string;
    emoji: string;
}

export interface Match {
    id: string;
    team1: Team;
    team2: Team;
    date: string;
    time: string;
    venue: string;
    status: 'upcoming' | 'live' | 'completed' | 'cancelled';
    result?: MatchResult;
    cricinfoId?: string;
}

export interface MatchResult {
    team1Score: number;
    team2Score: number;
    winner: string; // team id or 'draw'
    firstInningRange?: string;
    secondInningRange?: string;
    teamMore4s?: string;
    teamMore6s?: string;
    playerMax6s?: string;
    most4s?: string;
    playerOfMatch?: string;
    economy?: string;
    superStriker?: string;
    lastEditedAt?: string; // ISO timestamp
    lastEditedBy?: string; // username or email
}

export interface Prediction {
    id: string;
    matchId: string;
    userId: string;
    username?: string;
    submittedAt: Date | string;
    team1Score: number;
    team2Score: number;
    winner: string;
    firstInningRange?: string;
    secondInningRange?: string;
    teamMore4s?: string;
    teamMore6s?: string;
    playerMax6s?: string;
    most4s?: string;
    playerOfMatch?: string;
    economy?: string;
    superStriker?: string;
    points?: number;
    scored?: boolean;
}

export interface UserStats {
    userId: string;
    username: string;
    totalPredictions: number;
    correctWinners: number;
    totalPoints: number;
    rank?: number;
}
export interface League {
    id: string;
    name: string;
    ownerId: string;
    memberIds: string[];
    createdAt: string; // ISO date
}

export interface LeagueInvitation {
    leagueId: string;
    inviteeId: string;
    status: 'pending' | 'accepted' | 'rejected';
}

export interface UserProfile extends UserStats {
    avatarUrl?: string;
    displayName?: string;
    joinedLeagues: string[];
}

export interface Player {
    name: string;
    role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper';
}

export interface DropdownOption {
    label: string;
    value: string;
    badge?: string;
}

export const TEAM_SQUADS: Record<string, Player[]> = {
    'csk': [
        { name: 'Ruturaj Gaikwad (c)', role: 'Batsman' },
        { name: 'Ayush Mhatre', role: 'Batsman' },
        { name: 'M.S. Dhoni', role: 'Wicket-keeper' },
        { name: 'Sanju Samson', role: 'Wicket-keeper' },
        { name: 'Dewald Brevis', role: 'Batsman' },
        { name: 'Urvil Patel', role: 'Wicket-keeper' },
        { name: 'Shivam Dube', role: 'All-rounder' },
        { name: 'Jamie Overton', role: 'All-rounder' },
        { name: 'Ramakrishna Ghosh', role: 'Wicket-keeper' },
        { name: 'Noor Ahmad', role: 'Bowler' },
        { name: 'Khaleel Ahmed', role: 'Bowler' },
        { name: 'Anshul Kamboj', role: 'Bowler' },
        { name: 'Gurjapneet Singh', role: 'Bowler' },
        { name: 'Shreyas Gopal', role: 'All-rounder' },
        { name: 'Mukesh Choudhary', role: 'Bowler' },
        { name: 'Nathan Ellis', role: 'Bowler' },
        { name: 'Akeal Hosein', role: 'All-rounder' },
        { name: 'Prashant Veer', role: 'Batsman' },
        { name: 'Kartik Sharma', role: 'Batsman' },
        { name: 'Matthew Short', role: 'All-rounder' },
        { name: 'Aman Khan', role: 'All-rounder' },
        { name: 'Sarfaraz Khan', role: 'Batsman' },
        { name: 'Matt Henry', role: 'Bowler' },
        { name: 'Rahul Chahar', role: 'Bowler' },
        { name: 'Zak Foulkes', role: 'Bowler' }
    ],
    'rcb': [
        { name: 'Rajat Patidar (c)', role: 'Batsman' },
        { name: 'Virat Kohli', role: 'Batsman' },
        { name: 'Devdutt Padikkal', role: 'Batsman' },
        { name: 'Phil Salt', role: 'Wicket-keeper' },
        { name: 'Jitesh Sharma', role: 'Wicket-keeper' },
        { name: 'Krunal Pandya', role: 'All-rounder' },
        { name: 'Swapnil Singh', role: 'All-rounder' },
        { name: 'Tim David', role: 'Batsman' },
        { name: 'Romario Shepherd', role: 'All-rounder' },
        { name: 'Jacob Bethell', role: 'All-rounder' },
        { name: 'Josh Hazlewood', role: 'Bowler' },
        { name: 'Yash Dayal', role: 'Bowler' },
        { name: 'Bhuvneshwar Kumar', role: 'Bowler' },
        { name: 'Nuwan Thushara', role: 'Bowler' },
        { name: 'Rasikh Salam', role: 'Bowler' },
        { name: 'Abhinandan Singh', role: 'Bowler' },
        { name: 'Suyash Sharma', role: 'Bowler' },
        { name: 'Venkatesh Iyer', role: 'All-rounder' },
        { name: 'Jacob Duffy', role: 'Bowler' },
        { name: 'Satvik Deswal', role: 'Batsman' },
        { name: 'Mangesh Yadav', role: 'Bowler' },
        { name: 'Jordan Cox', role: 'Wicket-keeper' },
        { name: 'Vicky Ostwal', role: 'Bowler' },
        { name: 'Vihaan Malhotra', role: 'Batsman' },
        { name: 'Kanishk Chouhan', role: 'Batsman' }
    ],
    'mi': [
        { name: 'Hardik Pandya', role: 'All-rounder' },
        { name: 'Rohit Sharma', role: 'Batsman' },
        { name: 'Suryakumar Yadav', role: 'Batsman' },
        { name: 'Tilak Varma', role: 'Batsman' },
        { name: 'Ryan Rickelton', role: 'Wicket-keeper' },
        { name: 'Robin Minz', role: 'Wicket-keeper' },
        { name: 'Raj Bawa', role: 'All-rounder' },
        { name: 'Raghu Sharma', role: 'Wicket-keeper' },
        { name: 'Mitchell Santner', role: 'All-rounder' },
        { name: 'Corbin Bosch', role: 'All-rounder' },
        { name: 'Naman Dhir', role: 'All-rounder' },
        { name: 'Jasprit Bumrah', role: 'Bowler' },
        { name: 'Trent Boult', role: 'Bowler' },
        { name: 'Allah Ghafanzar', role: 'Bowler' },
        { name: 'Ashwani Kumar', role: 'Bowler' },
        { name: 'Deepak Chahar', role: 'All-rounder' },
        { name: 'Will Jacks', role: 'All-rounder' },
        { name: 'Sherfane Rutherford', role: 'All-rounder' },
        { name: 'Mayank Markande', role: 'Bowler' },
        { name: 'Shardul Thakur', role: 'All-rounder' },
        { name: 'Quinton de Kock', role: 'Wicket-keeper' },
        { name: 'Danish Malewar', role: 'Batsman' },
        { name: 'Mohammad Izhar', role: 'Batsman' },
        { name: 'Atharva Ankolekar', role: 'All-rounder' },
        { name: 'Mayank Rawat', role: 'Wicket-keeper' }
    ],
    'lsg': [
        { name: 'Abdul Samad', role: 'All-rounder' },
        { name: 'Ayush Badoni', role: 'All-rounder' },
        { name: 'Aiden Markram', role: 'All-rounder' },
        { name: 'Matthew Breetzke', role: 'Batsman' },
        { name: 'Himmat Singh', role: 'All-rounder' },
        { name: 'Rishabh Pant (c)', role: 'Wicket-keeper' },
        { name: 'Nicholas Pooran', role: 'Wicket-keeper' },
        { name: 'Mitchell Marsh', role: 'All-rounder' },
        { name: 'Shahbaz Ahmed', role: 'All-rounder' },
        { name: 'Arshin Kulkarni', role: 'Batsman' },
        { name: 'Mayank Yadav', role: 'Bowler' },
        { name: 'Avesh Khan', role: 'Bowler' },
        { name: 'Mohsin Khan', role: 'Bowler' },
        { name: 'Manimaran Siddharth', role: 'Bowler' },
        { name: 'Digvesh Rathi', role: 'Batsman' },
        { name: 'Prince Yadav', role: 'Bowler' },
        { name: 'Akash Singh', role: 'Bowler' },
        { name: 'Mohammed Shami', role: 'Bowler' },
        { name: 'Arjun Tendulkar', role: 'All-rounder' },
        { name: 'Wanindu Hasaranga', role: 'All-rounder' },
        { name: 'Anrich Nortje', role: 'Bowler' },
        { name: 'Mukul Choudhary', role: 'Batsman' },
        { name: 'Naman Tiwari', role: 'Bowler' },
        { name: 'Akshat Raghuwanshi', role: 'Batsman' },
        { name: 'Josh Inglis', role: 'Wicket-keeper' }
    ],
    'kkr': [
        { name: 'Ajinkya Rahane', role: 'Batsman' },
        { name: 'Angkrish Raghuvanshi', role: 'Batsman' },
        { name: 'Anukul Roy', role: 'All-rounder' },
        { name: 'Harshit Rana', role: 'Bowler' },
        { name: 'Manish Pandey', role: 'Batsman' },
        { name: 'Ramandeep Singh', role: 'All-rounder' },
        { name: 'Rinku Singh', role: 'Batsman' },
        { name: 'Rovman Powell', role: 'All-rounder' },
        { name: 'Sunil Narine', role: 'All-rounder' },
        { name: 'Umran Malik', role: 'Bowler' },
        { name: 'Vaibhav Arora', role: 'Bowler' },
        { name: 'Varun Chakaravarthy', role: 'Bowler' },
        { name: 'Cameron Green', role: 'All-rounder' },
        { name: 'Finn Allen', role: 'Batsman' },
        { name: 'Matheesha Pathirana', role: 'Bowler' },
        { name: 'Tejasvi Singh', role: 'Batsman' },
        { name: 'Kartik Tyagi', role: 'Bowler' },
        { name: 'Prashant Solanki', role: 'Batsman' },
        { name: 'Rahul Tripathi', role: 'Batsman' },
        { name: 'Tim Seifert', role: 'Wicket-keeper' },
        { name: 'Mustafizur Rahman', role: 'Bowler' },
        { name: 'Sarthak Ranjan', role: 'Batsman' },
        { name: 'Daksh Kamra', role: 'Batsman' },
        { name: 'Rachin Ravindra', role: 'All-rounder' },
        { name: 'Akash Deep', role: 'Bowler' }
    ],
    'srh': [
        { name: 'Pat Cummins (c)', role: 'All-rounder' },
        { name: 'Travis Head', role: 'Batsman' },
        { name: 'Abhishek Sharma', role: 'All-rounder' },
        { name: 'Aniket Verma', role: 'Batsman' },
        { name: 'R. Smaran', role: 'Batsman' },
        { name: 'Ishan Kishan', role: 'Wicket-keeper' },
        { name: 'Heinrich Klaasen', role: 'Wicket-keeper' },
        { name: 'Nitish Kumar Reddy', role: 'All-rounder' },
        { name: 'Harsh Dubey', role: 'Bowler' },
        { name: 'Kamindu Mendis', role: 'All-rounder' },
        { name: 'Harshal Patel', role: 'Bowler' },
        { name: 'Brydon Carse', role: 'All-rounder' },
        { name: 'Jaydev Unadkat', role: 'Bowler' },
        { name: 'Eshan Malinga', role: 'Bowler' },
        { name: 'Zeeshan Ansari', role: 'All-rounder' },
        { name: 'Shivang Kumar', role: 'Batsman' },
        { name: 'Salil Arora', role: 'Batsman' },
        { name: 'Sakib Hussain', role: 'All-rounder' },
        { name: 'Onkar Tarmale', role: 'Batsman' },
        { name: 'Amit Kumar', role: 'Bowler' },
        { name: 'Praful Hinge', role: 'All-rounder' },
        { name: 'Krains Fuletra', role: 'Batsman' },
        { name: 'Liam Livingstone', role: 'All-rounder' },
        { name: 'Shivam Mavi', role: 'Bowler' },
        { name: 'Jack Edwards', role: 'Batsman' }
    ],
    'pbks': [
        { name: 'Prabhsimran Singh', role: 'Wicket-keeper' },
        { name: 'Priyansh Arya', role: 'All-rounder' },
        { name: 'Shreyas Iyer', role: 'Batsman' },
        { name: 'Shashank Singh', role: 'All-rounder' },
        { name: 'Nehal Wadhera', role: 'Batsman' },
        { name: 'Marcus Stoinis', role: 'All-rounder' },
        { name: 'Azmatullah Omarzai', role: 'All-rounder' },
        { name: 'Marco Jansen', role: 'All-rounder' },
        { name: 'Harpreet Brar', role: 'All-rounder' },
        { name: 'Yuzvendra Chahal', role: 'Bowler' },
        { name: 'Arshdeep Singh', role: 'Bowler' },
        { name: 'Musheer Khan', role: 'All-rounder' },
        { name: 'Pyala Avinash', role: 'Batsman' },
        { name: 'Harnoor Pannu', role: 'Batsman' },
        { name: 'Suryansh Shedge', role: 'All-rounder' },
        { name: 'Mitchell Owen', role: 'Batsman' },
        { name: 'Xavier Bartlett', role: 'Bowler' },
        { name: 'Lockie Ferguson', role: 'Bowler' },
        { name: 'Vyshak Vijaykumar', role: 'Bowler' },
        { name: 'Yash Thakur', role: 'Bowler' },
        { name: 'Vishnu Vinod', role: 'Wicket-keeper' },
        { name: 'Cooper Connolly', role: 'All-rounder' },
        { name: 'Ben Dwarshuis', role: 'All-rounder' },
        { name: 'Pravin Dubey', role: 'Bowler' },
        { name: 'Vishal Nishad', role: 'Batsman' }
    ],
    'rr': [
        { name: 'Ravindra Jadeja', role: 'All-rounder' },
        { name: 'Sam Curran', role: 'All-rounder' },
        { name: 'Donovan Ferreira', role: 'All-rounder' },
        { name: 'Sandeep Sharma', role: 'Bowler' },
        { name: 'Shubham Dubey', role: 'All-rounder' },
        { name: 'Vaibhav Suryavanshi', role: 'Batsman' },
        { name: 'Lhuan-dre Pretorius', role: 'All-rounder' },
        { name: 'Shimron Hetmyer', role: 'Batsman' },
        { name: 'Yashasvi Jaiswal', role: 'Batsman' },
        { name: 'Dhruv Jurel', role: 'Wicket-keeper' },
        { name: 'Riyan Parag', role: 'All-rounder' },
        { name: 'Yudhvir Singh Charak', role: 'All-rounder' },
        { name: 'Jofra Archer', role: 'Bowler' },
        { name: 'Tushar Deshpande', role: 'Bowler' },
        { name: 'Kwena Maphaka', role: 'Bowler' },
        { name: 'Nandre Burger', role: 'Bowler' },
        { name: 'Ravi Bishnoi', role: 'Bowler' },
        { name: 'Sushant Mishra', role: 'Bowler' },
        { name: 'Yash Raj Punja', role: 'Batsman' },
        { name: 'Vignesh Puthur', role: 'Batsman' },
        { name: 'Ravi Singh', role: 'Batsman' },
        { name: 'Aman Rao', role: 'Batsman' },
        { name: 'Brijesh Sharma', role: 'Batsman' },
        { name: 'Adam Milne', role: 'Bowler' },
        { name: 'Kuldeep Sen', role: 'Bowler' }
    ],
    'dc': [
        { name: 'Nitish Rana', role: 'Batsman' },
        { name: 'Abishek Porel', role: 'Wicket-keeper' },
        { name: 'Ajay Mandal', role: 'Batsman' },
        { name: 'Ashutosh Sharma', role: 'All-rounder' },
        { name: 'Axar Patel', role: 'All-rounder' },
        { name: 'Dushmantha Chameera', role: 'Bowler' },
        { name: 'Karun Nair', role: 'Batsman' },
        { name: 'KL Rahul', role: 'Wicket-keeper' },
        { name: 'Kuldeep Yadav', role: 'Bowler' },
        { name: 'Madhav Tiwari', role: 'Batsman' },
        { name: 'Mitchell Starc', role: 'Bowler' },
        { name: 'Sameer Rizvi', role: 'All-rounder' },
        { name: 'T Natarajan', role: 'Bowler' },
        { name: 'Tripurana Vijay', role: 'All-rounder' },
        { name: 'Tristan Stubbs', role: 'Batsman' },
        { name: 'Vipraj Nigam', role: 'All-rounder' },
        { name: 'David Miller', role: 'Batsman' },
        { name: 'Ben Duckett', role: 'Batsman' },
        { name: 'Auqib Nabi', role: 'All-rounder' },
        { name: 'Pathum Nissanka', role: 'Batsman' },
        { name: 'Lungi Ngidi', role: 'Bowler' },
        { name: 'Sahil Parakh', role: 'Batsman' },
        { name: 'Prithvi Shaw', role: 'Batsman' },
        { name: 'Kyle Jamieson', role: 'All-rounder' }
    ],
    'gt': [
        { name: 'Shubman Gill (c)', role: 'Batsman' },
        { name: 'Sai Sudharsan', role: 'Batsman' },
        { name: 'Kumar Kushagra', role: 'Wicket-keeper' },
        { name: 'Anuj Rawat', role: 'Wicket-keeper' },
        { name: 'Jos Buttler', role: 'Wicket-keeper' },
        { name: 'Nishant Sindhu', role: 'All-rounder' },
        { name: 'Washington Sundar', role: 'All-rounder' },
        { name: 'Glenn Phillips', role: 'All-rounder' },
        { name: 'Arshad Khan', role: 'All-rounder' },
        { name: 'Shahrukh Khan', role: 'All-rounder' },
        { name: 'Rahul Tewatia', role: 'All-rounder' },
        { name: 'Kagiso Rabada', role: 'Bowler' },
        { name: 'Mohammed Siraj', role: 'Bowler' },
        { name: 'Prasidh Krishna', role: 'Bowler' },
        { name: 'Ishant Sharma', role: 'Bowler' },
        { name: 'Gurnoor Singh Brar', role: 'Batsman' },
        { name: 'Rashid Khan', role: 'Bowler' },
        { name: 'Manav Suthar', role: 'Bowler' },
        { name: 'Sai Kishore', role: 'Bowler' },
        { name: 'Jayant Yadav', role: 'All-rounder' },
        { name: 'Ashok Sharma', role: 'Batsman' },
        { name: 'Jason Holder', role: 'All-rounder' },
        { name: 'Tom Banton', role: 'Wicket-keeper' },
        { name: 'Prithvi Raj Yarra', role: 'All-rounder' },
        { name: 'Luke Wood', role: 'Bowler' }
    ]
};

export function getMatchPlayers(team1Id: string, team2Id: string): DropdownOption[] {
    const list1 = (TEAM_SQUADS[team1Id] || []).map(p => ({ label: p.name, value: p.name, badge: p.role }));
    const list2 = (TEAM_SQUADS[team2Id] || []).map(p => ({ label: p.name, value: p.name, badge: p.role }));
    return [...list1, ...list2].sort((a, b) => a.label.localeCompare(b.label));
}
