"use strict";

class TargetCelebration {
  constructor(surface) {
    this.surface = surface;
    this.reached = false;
    this.canvas = null;
    this.frame = null;
    this.motion = matchMedia("(prefers-reduced-motion: reduce)");
    this.motion.addEventListener("change", () => {
      if (this.motion.matches) this.clearAnimation();
    });
  }
  clearAnimation() {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    if (this.canvas) this.canvas.remove();
    this.canvas = null;
  }
  update(reached) {
    this.surface.classList.toggle("target-reached", reached);
    if (!reached) this.clearAnimation();
    if (reached && !this.reached && !this.motion.matches) this.launch();
    this.reached = reached;
  }
  stop() {
    this.update(false);
  }
  launch() {
    this.clearAnimation();
    const canvas = document.createElement("canvas");
    canvas.className = "celebration";
    canvas.setAttribute("aria-hidden", "true");
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    this.canvas = canvas;
    document.body.append(canvas);
    const colors = ["#b84b0b", "#2166ad", "#e87921"];
    const particles = [];
    for (let burst = 0; burst < 3; burst++) {
      const x = canvas.width * (.25 + burst * .25);
      const y = canvas.height * (.25 + Math.random() * .15);
      for (let index = 0; index < 24; index++) {
        const angle = Math.PI * 2 * index / 24;
        const speed = 35 + Math.random() * 90;
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color: colors[burst] });
      }
    }
    let start;
    const draw = now => {
      if (start === undefined) start = now;
      const seconds = (now - start) / 1000;
      if (seconds >= 1.25) { this.clearAnimation(); return; }
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.globalAlpha = 1 - seconds / 1.25;
      for (const particle of particles) {
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x + particle.vx * seconds, particle.y + particle.vy * seconds + 45 * seconds * seconds, 3, 0, Math.PI * 2);
        context.fill();
      }
      this.frame = requestAnimationFrame(draw);
    };
    this.frame = requestAnimationFrame(draw);
  }
}
