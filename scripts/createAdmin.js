import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../environment';

// Removed @Injectable and type imports, as decorators and types are not valid in JS

export class AuthService  {
  // Removed 'private' and 'public' modifiers and type annotations
  constructor(http, platformId) {
    this.apiUrl = environment.apiUrl;
    this.currentUserSubject = new BehaviorSubject(null);
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.http = http;
    this.platformId = platformId;
    this.loadUserFromStorage();
  }

  // Removed 'private' modifier and type annotation
  isBrowser() {
    return isPlatformBrowser(this.platformId);
  }

  // Removed 'private' modifier and type annotation
  loadUserFromStorage() {
    if (!this.isBrowser()) return;

    const userJson = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');
    
    if (userJson && token) {
      try {
        const user = JSON.parse(userJson);
        this.currentUserSubject.next(user);
        
        // Token-ის ვალიდაცია გადავამოწმოთ
        this.validateToken().subscribe({
          next: (isValid) => {
            if (!isValid) {
              console.log('Token არ არის ვალიდური, გამოსვლა');
              this.logout();
            }
          },
          error: (error) => {
            console.error('Token ვალიდაციის შეცდომა:', error);
            this.logout();
          }
        });
      } catch (e) {
        console.error('Error parsing user from localStorage', e);
        this.clearStorageAndLogout();
      }
    }
  }

  // Token-ის ვალიდაციის მეთოდი
  // Removed 'private' modifier and type annotation
  validateToken() {
    if (!this.isLoggedIn()) return of(false);
    
    return this.http.get(`${this.apiUrl}/auth/validate`, {
      headers: {
        Authorization: `Bearer ${this.getToken()}`
      }
    }).pipe(
      map(() => {
        console.log('Token ვალიდურია');
        return true;
      }),
      catchError(error => {
        console.error('Token ვალიდაციის შეცდომა:', error);
        return of(false);
      })
    );
  }

  // მონაცემების განახლება უფრო უსაფრთხო მეთოდით
  refreshUserData() {
    if (!this.isLoggedIn()) {
      console.log('არ ხართ ავტორიზებული');
      return of(null);
    }
    
    const token = this.getToken();
    if (!token) {
      console.log('Token არ არსებობს');
      return of(null);
    }

    return this.http.get(`${this.apiUrl}/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).pipe(
      tap((user) => {
        if (user && this.isBrowser()) {
          console.log('მომხმარებლის მონაცემები განახლდა:', user);
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
      }),
      catchError(error => {
        console.error('მომხმარებლის მონაცემების განახლების შეცდომა:', error);
        
        // თუ 401 ან 403 - token არასწორია
        if (error.status === 401 || error.status === 403) {
          console.log('არავალიდური token, გამოსვლა');
          this.logout();
        }
        // თუ 404 - მომხმარებელი არ მოიძებნა
        else if (error.status === 404) {
          console.log('მომხმარებელი არ მოიძებნა, შესაძლოა წაშლილი იყოს');
          this.logout();
        }
        
        return of(null);
      })
    );
  }

  register(userData) {
    return this.http.post(`${this.apiUrl}/auth/register`, userData);
  }

  login(email, password) {
    return this.http.post(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((response) => {
          if (response && response.token && response.user && this.isBrowser()) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
            console.log('წარმატებით ავტორიზდა:', response.user);
          }
        }),
        catchError(error => {
          console.error('ავტორიზაციის შეცდომა:', error);
          throw error;
        })
      );
  }

  verifyEmail(token) {
    return this.http.get(`${this.apiUrl}/auth/verify/${token}`);
  }

  logout() {
    console.log('გამოსვლა სისტემიდან');
    this.clearStorageAndLogout();
  }

  // Removed 'private' modifier and type annotation
  clearStorageAndLogout() {
    if (this.isBrowser()) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
    }
    this.currentUserSubject.next(null);
  }

  getCurrentUser() {
    return this.currentUserSubject.value;
  }

  getToken() {
    if (!this.isBrowser()) return null;
    return localStorage.getItem('token');
  }

  isLoggedIn() {
    const token = this.getToken();
    if (!token) return false;
    
    // Token-ის ვადის შემოწმება (თუ JWT-ია)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < currentTime) {
        console.log('Token-ის ვადა გასულია');
        this.logout();
        return false;
      }
      
      return true;
    } catch (e) {
      // თუ JWT არ არის, მხოლოდ არსებობა ვამოწმებთ
      return !!token;
    }
  }

  updateProfileImage(file) {
    const formData = new FormData();
    formData.append('profileImage', file);
  
    const token = this.getToken();
    if (!token) {
      console.error('Token არ არსებობს');
      return of(null);
    }

    return this.http.put(`${this.apiUrl}/users/profile-image`, formData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).pipe(
      tap((response) => {
        if (response && response.user && this.isBrowser()) {
          console.log('პროფილის სურათი განახლდა:', response.user);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
        }
      }),
      catchError(error => {
        console.error('პროფილის სურათის განახლების შეცდომა:', error);
        
        if (error.status === 401 || error.status === 403) {
          console.log('არავალიდური token განახლებისას');
          this.logout();
        }
        
        return of(null);
      })
    );
  }

  // დამატებითი utility მეთოდები
  
  // მომხმარებლის სტატუსის შემოწმება
  checkUserStatus() {
    return this.refreshUserData();
  }

  // Token-ის განახლება (თუ სერვერზე გაქვთ refresh token endpoint)
  refreshToken() {
    const token = this.getToken();
    if (!token) return of(null);

    return this.http.post(`${this.apiUrl}/auth/refresh`, { token }).pipe(
      tap((response) => {
        if (response?.token && this.isBrowser()) {
          localStorage.setItem('token', response.token);
          if (response.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
          }
        }
      }),
      catchError(error => {
        console.error('Token განახლების შეცდომა:', error);
        this.logout();
        return of(null);
      })
    );
  }
}