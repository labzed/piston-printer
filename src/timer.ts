export class Timer {
  private startTime: number;
  private lastTime: number;

  constructor() {
    this.startTime = +new Date();
    this.lastTime = this.startTime;
  }

  public mark(): string {
    const now = +new Date();
    const result = {
      section: now - this.lastTime,
      total: now - this.startTime
    }
    this.lastTime = now;
    return `${result.section}(${result.total})ms`
  }
}
