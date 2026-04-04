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
    status: 'upcoming' | 'live' | 'completed';
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

export const TEAM_SQUADS: Record<string, string[]> = {
    'csk': ['Ruturaj Gaikwad (c)', 'Ayush Mhatre', 'M.S. Dhoni', 'Sanju Samson', 'Dewald Brevis', 'Urvil Patel', 'Shivam Dube', 'Jamie Overton', 'Ramakrishna Ghosh', 'Noor Ahmad', 'Khaleel Ahmed', 'Anshul Kamboj', 'Gurjapneet Singh', 'Shreyas Gopal', 'Mukesh Choudhary', 'Nathan Ellis', 'Akeal Hosein', 'Prashant Veer', 'Kartik Sharma', 'Matthew Short', 'Aman Khan', 'Sarfaraz Khan', 'Matt Henry', 'Rahul Chahar', 'Zak Foulkes'],
    'rcb': ['Rajat Patidar (c)', 'Virat Kohli', 'Devdutt Padikkal', 'Phil Salt', 'Jitesh Sharma', 'Krunal Pandya', 'Swapnil Singh', 'Tim David', 'Romario Shepherd', 'Jacob Bethell', 'Josh Hazlewood', 'Yash Dayal', 'Bhuvneshwar Kumar', 'Nuwan Thushara', 'Rasikh Salam', 'Abhinandan Singh', 'Suyash Sharma', 'Venkatesh Iyer', 'Jacob Duffy', 'Satvik Deswal', 'Mangesh Yadav', 'Jordan Cox', 'Vicky Ostwal', 'Vihaan Malhotra', 'Kanishk Chouhan'],
    'mi': ['Hardik Pandya', 'Rohit Sharma', 'Suryakumar Yadav', 'Tilak Varma', 'Ryan Rickelton', 'Robin Minz', 'Raj Bawa', 'Raghu Sharma', 'Mitchell Santner', 'Corbin Bosch', 'Naman Dhir', 'Jasprit Bumrah', 'Trent Boult', 'Allah Ghafanzar', 'Ashwani Kumar', 'Deepak Chahar', 'Will Jacks', 'Sherfane Rutherford', 'Mayank Markande', 'Shardul Thakur', 'Quinton de Kock', 'Danish Malewar', 'Mohammad Izhar', 'Atharva Ankolekar', 'Mayank Rawat'],
    'lsg': ['Abdul Samad', 'Ayush Badoni', 'Aiden Markram', 'Matthew Breetzke', 'Himmat Singh', 'Rishabh Pant (c)', 'Nicholas Pooran', 'Mitchell Marsh', 'Shahbaz Ahmed', 'Arshin Kulkarni', 'Mayank Yadav', 'Avesh Khan', 'Mohsin Khan', 'Manimaran Siddharth', 'Digvesh Rathi', 'Prince Yadav', 'Akash Singh', 'Mohammed Shami', 'Arjun Tendulkar', 'Wanindu Hasaranga', 'Anrich Nortje', 'Mukul Choudhary', 'Naman Tiwari', 'Akshat Raghuwanshi', 'Josh Inglis'],
    'kkr': ['Ajinkya Rahane', 'Angkrish Raghuvanshi', 'Anukul Roy', 'Harshit Rana', 'Manish Pandey', 'Ramandeep Singh', 'Rinku Singh', 'Rovman Powell', 'Sunil Narine', 'Umran Malik', 'Vaibhav Arora', 'Varun Chakaravarthy', 'Cameron Green', 'Finn Allen', 'Matheesha Pathirana', 'Tejasvi Singh', 'Kartik Tyagi', 'Prashant Solanki', 'Rahul Tripathi', 'Tim Seifert', 'Mustafizur Rahman', 'Sarthak Ranjan', 'Daksh Kamra', 'Rachin Ravindra', 'Akash Deep'],
    'srh': ['Pat Cummins (c)', 'Travis Head', 'Abhishek Sharma', 'Aniket Verma', 'R. Smaran', 'Ishan Kishan', 'Heinrich Klaasen', 'Nitish Kumar Reddy', 'Harsh Dubey', 'Kamindu Mendis', 'Harshal Patel', 'Brydon Carse', 'Jaydev Unadkat', 'Eshan Malinga', 'Zeeshan Ansari', 'Shivang Kumar', 'Salil Arora', 'Sakib Hussain', 'Onkar Tarmale', 'Amit Kumar', 'Praful Hinge', 'Krains Fuletra', 'Liam Livingstone', 'Shivam Mavi', 'Jack Edwards'],
    'pbks': ['Prabhsimran Singh', 'Priyansh Arya', 'Shreyas Iyer', 'Shashank Singh', 'Nehal Wadhera', 'Marcus Stoinis', 'Azmatullah Omarzai', 'Marco Jansen', 'Harpreet Brar', 'Yuzvendra Chahal', 'Arshdeep Singh', 'Musheer Khan', 'Pyala Avinash', 'Harnoor Pannu', 'Suryansh Shedge', 'Mitchell Owen', 'Xavier Bartlett', 'Lockie Ferguson', 'Vyshak Vijaykumar', 'Yash Thakur', 'Vishnu Vinod', 'Cooper Connolly', 'Ben Dwarshuis', 'Pravin Dubey', 'Vishal Nishad'],
    'rr': ['Ravindra Jadeja', 'Sam Curran', 'Donovan Ferreira', 'Sandeep Sharma', 'Shubham Dubey', 'Vaibhav Suryavanshi', 'Lhuan-dre Pretorius', 'Shimron Hetmyer', 'Yashasvi Jaiswal', 'Dhruv Jurel', 'Riyan Parag', 'Yudhvir Singh Charak', 'Jofra Archer', 'Tushar Deshpande', 'Kwena Maphaka', 'Nandre Burger', 'Ravi Bishnoi', 'Sushant Mishra', 'Yash Raj Punja', 'Vignesh Puthur', 'Ravi Singh', 'Aman Rao', 'Brijesh Sharma', 'Adam Milne', 'Kuldeep Sen'],
    'dc': ['Nitish Rana', 'Abishek Porel', 'Ajay Mandal', 'Ashutosh Sharma', 'Axar Patel', 'Dushmantha Chameera', 'Karun Nair', 'KL Rahul', 'Kuldeep Yadav', 'Madhav Tiwari', 'Mitchell Starc', 'Sameer Rizvi', 'T Natarajan', 'Tripurana Vijay', 'Tristan Stubbs', 'Vipraj Nigam', 'David Miller', 'Ben Duckett', 'Auqib Nabi', 'Pathum Nissanka', 'Lungi Ngidi', 'Sahil Parakh', 'Prithvi Shaw', 'Kyle Jamieson'],
    'gt': ['Shubman Gill (c)', 'Sai Sudharsan', 'Kumar Kushagra', 'Anuj Rawat', 'Jos Buttler', 'Nishant Sindhu', 'Washington Sundar', 'Glenn Phillips', 'Arshad Khan', 'Shahrukh Khan', 'Rahul Tewatia', 'Kagiso Rabada', 'Mohammed Siraj', 'Prasidh Krishna', 'Ishant Sharma', 'Gurnoor Singh Brar', 'Rashid Khan', 'Manav Suthar', 'Sai Kishore', 'Jayant Yadav', 'Ashok Sharma', 'Jason Holder', 'Tom Banton', 'Prithvi Raj Yarra', 'Luke Wood']
};

export function getMatchPlayers(team1Id: string, team2Id: string): string[] {
    const list = [...(TEAM_SQUADS[team1Id] || []), ...(TEAM_SQUADS[team2Id] || [])];
    return list.sort((a, b) => a.localeCompare(b));
}
