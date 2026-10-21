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
    const colors = ["#ff6a13", "#0a5cff", "#ffb800", "#ff27c8", "#00cfff", "#9a35ff"];
    const particles = [];
    for (let burst = 0; burst < 18; burst++) {
      const x = canvas.width * (.12 + Math.random() * .76);
      const y = canvas.height * (.15 + Math.random() * .5);
      for (let index = 0; index < 84; index++) {
        const angle = Math.PI * 2 * index / 84;
        const speed = Math.min(canvas.width, canvas.height) * (.45 + Math.random() * .7);
        particles.push({
          x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          delay: burst * .235, radius: 3 + Math.random() * 4, color: colors[burst % colors.length]
        });
      }
    }
    let start;
    const draw = now => {
      if (start === undefined) start = now;
      const seconds = (now - start) / 1000;
      if (seconds >= 5.8) { this.clearAnimation(); return; }
      context.clearRect(0, 0, canvas.width, canvas.height);
      for (const particle of particles) {
        const age = seconds - particle.delay;
        if (age < 0 || age > 1.7) continue;
        context.globalAlpha = (1 - age / 1.7) ** .7;
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x + particle.vx * age, particle.y + particle.vy * age + 65 * age * age, particle.radius * (1 - age / 3), 0, Math.PI * 2);
        context.fill();
      }
      this.frame = requestAnimationFrame(draw);
    };
    this.frame = requestAnimationFrame(draw);
  }
}
