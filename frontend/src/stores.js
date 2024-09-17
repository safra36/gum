import { browser } from "$app/environment";
import { writable } from "svelte/store";

const getStoredToken = () => {
  if (browser) {
    return localStorage.getItem('authToken') || '';
  }
  return '';
};

export let authToken = writable(getStoredToken());

if (browser) {
  authToken.subscribe((value) => {
    localStorage.setItem('authToken', value);
  });
}