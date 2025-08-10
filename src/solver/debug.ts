

export function soucet(jedna: number, dva: number): number {
  return jedna + dva;
}

export function deleni(jedna: number, dva: number): number {

    if (dva === 0) {
        return 0; // Handle division by zero
    }
  return jedna / dva;
}

