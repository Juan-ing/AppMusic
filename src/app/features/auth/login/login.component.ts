import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, NgIf],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  email = '';
  password = '';
  remember = true;
  showPassword = false;
  busy = false;
  error = '';
  success = '';

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  async login() {
    this.error = '';
    this.success = '';
    if (!this.email.trim()) {
      this.error = 'Ingresa tu correo electrónico.';
      return;
    }
    if (!this.password) {
      this.error = 'Ingresa tu contraseña.';
      return;
    }
    this.busy = true;
    try {
      await this.authService.login(this.email.trim(), this.password);
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

  async resetPassword() {
    this.error = '';
    this.success = '';
    if (!this.email.trim()) {
      this.error = 'Ingresa tu correo para recuperar la contraseña.';
      return;
    }
    try {
      await this.authService.resetPassword(this.email.trim());
      this.success = 'Te enviamos un correo para restablecer tu contraseña.';
    } catch (error) {
      this.error = this.authService.getErrorMessage(error);
    }
  }
}
