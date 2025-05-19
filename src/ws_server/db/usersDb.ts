type UserData = {
  password: string;
  wins: number;
};

const users: Record<string, UserData> = {};

export function createUser(name: string, password: string): boolean {
  if (users[name]) return false;
  users[name] = { password, wins: 0 };
  return true;
}

export function validateUser(name: string, password: string): boolean {
  return !!users[name] && users[name].password === password;
}

export function getUserList() {
  return Object.entries(users).map(([name, data]) => ({
    name,
    wins: data.wins,
  }));
}

export function getUserIndex(name: string): string {
  return name;
}

export function increaseWins(name: string) {
  if (users[name]) users[name].wins++;
}
