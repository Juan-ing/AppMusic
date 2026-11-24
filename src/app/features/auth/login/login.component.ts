import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
    readonly authService: AuthService,
    private router: Router,
    private readonly route: ActivatedRoute,
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
      await this.authService.login(this.email.trim(), this.password, this.remember);
      await this.navigateAfterLogin();
    } catch (error) {
      this.error = this.authService.profileError() ? '' : this.authService.getErrorMessage(error);
    } finally {
      this.busy = false;
    }
  }

  async loginWithGoogle() {
    this.error = '';
    this.busy = true;
    try {
      await this.authService.loginWithGoogle();
      await this.navigateAfterLogin();
    } catch (error) {
      this.error = this.authService.profileError() ? '' : this.authService.getErrorMessage(error);
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

  private navigateAfterLogin(): Promise<boolean> {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const destination = returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : '/dashboard';
    return this.router.navigateByUrl(destination);
  }
}
