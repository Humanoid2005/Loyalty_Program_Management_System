export interface UserProfile {
  name: string;
  email: string;
  rollNumber: string;
  role: string;
}

export class User implements UserProfile {
  name: string;
  email: string;
  rollNumber: string
  role: string;

  constructor(name: string, email: string, rollNumber: string) {
    this.name = name;
    this.email = email;
    this.rollNumber = rollNumber;
    this.role = "participant";
  }
}

export class Admin extends User {
  constructor(name: string, email: string, rollNumber: string) {
    super(name, email, rollNumber);
    this.role = "admin";
  }
}

export class Volunteer extends User {
  constructor(name: string, email: string, rollNumber: string) {
    super(name, email, rollNumber);
    this.role = "volunteer";
  }
}