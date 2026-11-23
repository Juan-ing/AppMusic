import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  name = '';
  username = '';
  email = '';
  password = '';
  confirmation = '';
  showPassword = false;
  busy = false;
  error = '';
  success = '';

  constructor(private authService: AuthService, private router: Router) {}

  async register() {
    this.error = '';
    this.success = '';
    if (!this.name.trim() || !this.username.trim() || !this.email.trim() || !this.password || !this.confirmation) {
      this.error = 'Todos los campos son obligatorios.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.error = 'Ingresa un correo electrónico válido.';
      return;
    }
    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    if (this.password !== this.confirmation) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }
    this.busy = true;
    try {
      await this.authService.register(this.name.trim(), this.username.trim(), this.email.trim(), this.password);
      this.success = 'Cuenta creada correctamente.';
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      this.error = this.authService.getErrorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  async loginWithGoogle() {
    this.error = '';
    this.busy = true;
    try {
      await this.authService.loginWithGoogle();
      await this.router.navigate(['/dashboard']);
    } catch (error) {
      this.error = this.authService.getErrorMessage(error);
    } finally {
      this.busy = false;
    }
  }
}
