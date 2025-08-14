import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

export interface PanelDeviceInfo {
  status: string;
  username: string;
  password: string;
  country: string;
  expire: string;
  enabled: string;
  user_id: string;
  note: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class PanelApiService {
  private readonly API_BASE = 'https://my8k.me/api/api.php';

  constructor(private http: HttpClient) {}

  /**
   * Get device info from panel API
   */
  getDeviceInfo(username: string, password: string, apiKey: string): Observable<PanelDeviceInfo> {
    const params = {
      action: 'device_info',
      username,
      password,
      api_key: apiKey
    };

    return this.http.get<PanelDeviceInfo>(this.API_BASE, { params });
  }

  /**
   * Test panel connectivity
   */
  testPanelConnectivity(panelUrl: string): Observable<boolean> {
    return this.http.head(panelUrl, { observe: 'response' })
      .pipe(
        map(response => response.status === 200)
      );
  }
}

