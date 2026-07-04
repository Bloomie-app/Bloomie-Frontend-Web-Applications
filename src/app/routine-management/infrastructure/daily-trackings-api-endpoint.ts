import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { DailyTracking } from '../domain/model/daily-tracking.entity';
import { DailyTrackingResource, DailyTrackingsResponse } from './daily-tracking.response';
import { DailyTrackingAssembler } from './daily-tracking.assembler';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Endpoint client for daily tracking REST operations.
 * Base URL: /api/v1/daily-trackings
 */
export class DailyTrackingsApiEndpoint extends BaseApiEndpoint<
  DailyTracking,
  DailyTrackingResource,
  DailyTrackingsResponse,
  DailyTrackingAssembler
> {
  constructor(http: HttpClient) {
    super(
      http,
      `${environment.backendBasePath}${environment.backendDailyTrackingsEndpointPath}`,
      new DailyTrackingAssembler(),
    );
  }

  /**
   * Retrieves all daily tracking records for a patient.
   * GET /daily-trackings/patient/{patientId}
   */
  getByPatientId(patientId: number): Observable<DailyTracking[]> {
    return this.http.get<DailyTrackingResource[]>(`${this.endpointUrl}/patient/${patientId}`).pipe(
      map((resources) => resources.map((r) => this.assembler.toEntityFromResource(r))),
      catchError(this.handleError('Failed to fetch daily trackings for patient')),
    );
  }

  /**
   * Marks a routine as completed for a specific date.
   * POST /daily-trackings
   * Returns the ID of the created tracking entry.
   */
  markAsCompleted(patientId: number, routineId: number, date: string): Observable<number> {
    return this.http.post<any>(this.endpointUrl, { patientId, routineId, date }).pipe(
      map((resource) => resource?.id ?? 0),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 409) {
          return of(-1);
        }
        return this.handleError('Failed to mark routine as completed')(error);
      }),
    );
  }
}
