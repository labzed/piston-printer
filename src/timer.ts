export class Timer {
  private startTime: number;
  private lastTime: number;
  private id: string;

  constructor() {
    this.id = Math.random()
      .toString()
      .slice(2, 6);
    this.startTime = +new Date();
    this.lastTime = this.startTime;
  }

  public mark(): string {
    const now = +new Date();
    const result = {
      section: now - this.lastTime,
      total: now - this.startTime
    };
    this.lastTime = now;
    return `[${this.id}]${result.section}(${result.total})ms`;
  }
}
