import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from 'src/environments/environments';
import { User } from '../interfaces/user.interface';
import { AuthStatus } from '../interfaces/auth-status.enum';
import { LoginResponse } from '../interfaces/login-response.interface';
import { CheckTokenResponse } from '../interfaces/check-token.response';
import { RegisterResponse } from '../interfaces/register-response.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly baseUrl: string = environment.baseUrl;
  private http = inject( HttpClient );

  private _currentUser = signal<User|null>(null);
  private _authStatus = signal<AuthStatus>(AuthStatus.checking);

  /// Al mundo exterior(fuera de mi service) ///
  public currentUser = computed( () => this._currentUser() );
  public authStatus = computed( () => this._authStatus() );

  constructor() {
    //Verificamos el stado
    this.checkAuthStatus().subscribe();
   }

  private setAuthentication(user: User, token: string): boolean {
    this._currentUser.set( user );
    this._authStatus.set( AuthStatus.authenticated );
    localStorage.setItem('token', token);
    return true;
  }

  login( email: string, password: string ): Observable<boolean> {

    const url = `${ this.baseUrl }/auth/login`;
    // este es el body que vamos a mandar en la peticion al backend
    const body = { email: email, password: password };
    // <LoginResponse> esto es lo que estariamos esperando que nos regrese como el tipo de respuesta
    return this.http.post<LoginResponse>( url, body)
      .pipe(
        map( ({user, token}) => this.setAuthentication(user, token)),   //desestructuramos de la resp el user y token
        //TODO: errores
        catchError( err => throwError( () => err.error.message ) )
      );

  }

  register(name: string, email: string, password: string): Observable<boolean> {
    const url = `${ this.baseUrl }/auth/register`;
    // este es el body que vamos a mandar en la peticion al backend
    const body = {name: name, email: email, password: password };
    return this.http.post<RegisterResponse>( url, body)
      .pipe(
        map( ({user, token}) => this.setAuthentication(user, token)),
        catchError( err => throwError( () => err.error.message ) )
      );
  }

  checkAuthStatus():Observable<boolean>{

    const url = `${ this.baseUrl }/auth/check-token`;
    const token = localStorage.getItem('token');

    if ( !token ) {
      this.logout();
      return of(false);
    }

    //Verificamos la autenticacion del token creando los headers de Authorization
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${ token }`);

      return this.http.get<CheckTokenResponse>(url, {headers})
        .pipe(
          map( ({user, token}) => this.setAuthentication(user, token)),
          //Error
          catchError(() => {
           this._authStatus.set( AuthStatus.notAuthenticated );
           return of(false);
          })
        )
  }

  logout() {
    localStorage.removeItem('token');
    this._currentUser.set(null);
    this._authStatus.set( AuthStatus.notAuthenticated);
  }
}
