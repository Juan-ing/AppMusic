import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `<main class="not-found-page"><a class="brand" routerLink="/"><span class="brand-mark">A</span><span>AppMusic</span></a><span class="not-found-note">404 · FUERA DE SINTONÍA</span><h1>Esta página no está en la playlist.</h1><p>El enlace pudo cambiar o la página ya no existe. Volvamos a encontrar tu ritmo.</p><a class="landing-cta" routerLink="/">Ir al inicio <span>→</span></a><div class="not-found-record">♫</div></main>`,
})
export class NotFoundComponent {}
