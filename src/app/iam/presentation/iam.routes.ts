import { Routes } from '@angular/router';

const signInHome = () =>
  import('./views/sign-in-home/sign-in-home').then(
    (module) => module.SignInHome,
  );

const signIn = () =>
  import('./views/sign-in/sign-in').then((module) => module.SignIn);

const dermatologistSignIn = () =>
  import('./views/dermatologist-sign-in/dermatologist-sign-in').then(
    (module) => module.DermatologistSignIn,
  );

const dermatologistSignUp = () =>
  import('./views/dermatologist-sign-up/dermatologist-sign-up').then(
    (module) => module.DermatologistSignUp,
  );

const signUp = () =>
  import('./views/sign-up/sign-up').then((module) => module.SignUp);

const lifestyleForm = () =>
  import('./views/lifestyle-form/lifestyle-form').then((module) => module.LifestyleForm);

const userProfile = () =>
  import('./views/user-profile/user-profile').then((module) => module.UserProfile);

// Add this export:
const profileSettings = () =>
  import('./views/profile-settings/profile-settings').then((module) => module.ProfileSettings);

// En profileRoutes:
const skinProfile = () =>
  import('./views/skin-profile/skin-profile').then((module) => module.SkinProfileView);

const myPlan = () => import('./views/my-plan/my-plan').then((module) => module.MyPlan);


export const profileRoutes: Routes = [
  { path: '', loadComponent: userProfile },
  { path: 'settings', loadComponent: profileSettings },
  { path: 'skin-profile', loadComponent: skinProfile },
  { path: 'my-plan', loadComponent: myPlan },
];

export const iamRoutes: Routes = [
  { path: 'sign-in-home', loadComponent: signInHome },
  { path: 'sign-in', loadComponent: signIn },
  { path: 'sign-up', loadComponent: signUp },
  { path: 'lifestyle-form', loadComponent: lifestyleForm },
  { path: 'dermatologist-sign-in', loadComponent: dermatologistSignIn },
  { path: 'dermatologist-sign-up', loadComponent: dermatologistSignUp },
  { path: '', redirectTo: 'sign-in-home', pathMatch: 'full' },
  {
    path: 'select-plan',
    loadComponent: () =>
      import('../presentation/views/select-plan/select-plan').then((m) => m.SelectPlan),
  },
];

