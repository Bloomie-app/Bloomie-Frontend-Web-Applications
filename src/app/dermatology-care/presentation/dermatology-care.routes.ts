import {Routes} from '@angular/router';
import {dermSetupGuard} from './guards/derm-setup.guard';

const consultHome           = () => import('./views/consult-home/consult-home').then(m => m.ConsultHome);
const selectDoctor          = () => import('./views/select-doctor/select-doctor').then(m => m.SelectDoctor);
const bookAppointment       = () => import('./views/book-appointment/book-appointment').then(m => m.BookAppointment);
const paymentMethod         = () => import('./views/payment-method/payment-method').then(m => m.PaymentMethod);
const scheduledAppointments = () => import('./views/scheduled-appointments/scheduled-appointments').then(m => m.ScheduledAppointments);
const cancelAppointment     = () => import('./views/cancel-appointment/cancel-appointment').then(m => m.CancelAppointment);
const selectConsultation    = () => import('./views/select-consultation/select-consultation').then(m => m.SelectConsultation);
const consultationSummary   = () => import('./views/consultation-summary/consultation-summary').then(m => m.ConsultationSummary);
const virtualCall           = () => import('./views/virtual-call/virtual-call').then(m => m.VirtualCall);
const dermAgenda            = () => import('./views/derm-agenda/derm-agenda').then(m => m.DermAgenda);
const dermSetup             = () => import('./views/derm-setup/derm-setup').then(m => m.DermSetup);
const dermPastConsultations = () => import('./views/derm-past-consultations/derm-past-consultations').then(m => m.DermPastConsultations);
const dermConsultationSummary = () => import('./views/derm-consultation-summary/derm-consultation-summary').then(m => m.DermConsultationSummary);
const dermAvailability      = () => import('./views/derm-availability/derm-availability').then(m => m.DermAvailability);
const dermVirtualCall       = () => import('./views/derm-virtual-call/derm-virtual-call').then(m => m.DermVirtualCall);

/**
 * Route tree for patient dermatology care views — under /dermatology.
 */
export const dermatologyCareRoutes: Routes = [
  { path: '',                       loadComponent: consultHome           },
  { path: 'select-doctor',          loadComponent: selectDoctor          },
  { path: 'book-appointment',       loadComponent: bookAppointment       },
  { path: 'payment-method',         loadComponent: paymentMethod         },
  { path: 'scheduled-appointments', loadComponent: scheduledAppointments },
  { path: 'cancel-appointment',     loadComponent: cancelAppointment     },
  { path: 'select-consultation',    loadComponent: selectConsultation    },
  { path: 'consultation-summary',   loadComponent: consultationSummary   },
  { path: 'virtual-call',           loadComponent: virtualCall           },
];

/**
 * Route tree for dermatologist portal views — under /derm.
 */
export const dermRoutes: Routes = [
  { path: '', redirectTo: 'agenda', pathMatch: 'full' },
  { path: 'setup',  loadComponent: dermSetup  },
  { path: 'agenda', loadComponent: dermAgenda, canActivate: [dermSetupGuard] },
  { path: 'past-consultations', loadComponent: dermPastConsultations, canActivate: [dermSetupGuard] },
  { path: 'consultation-summary', loadComponent: dermConsultationSummary, canActivate: [dermSetupGuard] },
  { path: 'availability', loadComponent: dermAvailability, canActivate: [dermSetupGuard] },
  { path: 'virtual-call', loadComponent: dermVirtualCall, canActivate: [dermSetupGuard] },
  {
    path: 'profile',
    loadComponent: () => import('./views/derm-profile/derm-profile').then((m) => m.DermProfile),
    canActivate: [dermSetupGuard],
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('../../iam/presentation/views/profile-settings/profile-settings').then(
        (m) => m.ProfileSettings,
      ),
    canActivate: [dermSetupGuard],
  },
];
