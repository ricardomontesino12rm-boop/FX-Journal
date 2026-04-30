import { invoke } from '@tauri-apps/api/core';

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function webRequest(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data;
}

export async function getAccounts() {
  if (isTauriRuntime()) return invoke('list_accounts');
  return webRequest('/api/accounts');
}

export async function createAccount(payload) {
  if (isTauriRuntime()) return invoke('create_account', { payload });
  return webRequest('/api/accounts', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateAccount(id, payload) {
  if (isTauriRuntime()) return invoke('update_account', { id, payload });
  return webRequest(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteAccount(id) {
  if (isTauriRuntime()) return invoke('delete_account', { id });
  return webRequest(`/api/accounts/${id}`, { method: 'DELETE' });
}

export async function getTrades(accountId) {
  if (isTauriRuntime()) return invoke('list_trades', { accountId: accountId ? Number(accountId) : null });
  const query = accountId ? `?accountId=${accountId}` : '';
  return webRequest(`/api/trades${query}`);
}

export async function getTradeById(id) {
  if (isTauriRuntime()) return invoke('get_trade', { id: Number(id) });
  return webRequest(`/api/trades/${id}`);
}

export async function createTrade(payload) {
  if (isTauriRuntime()) return invoke('create_trade', { payload });
  return webRequest('/api/trades', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateTrade(id, payload) {
  if (isTauriRuntime()) return invoke('update_trade', { id: Number(id), payload });
  return webRequest(`/api/trades/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteTrade(id) {
  if (isTauriRuntime()) return invoke('delete_trade', { id: Number(id) });
  return webRequest(`/api/trades/${id}`, { method: 'DELETE' });
}

export async function getTags() {
  if (isTauriRuntime()) return invoke('get_tags');
  return webRequest('/api/tags');
}

export async function getStudyCases() {
  if (isTauriRuntime()) return invoke('list_study_cases');
  return webRequest('/api/study-cases');
}

export async function getStudyCase(id) {
  if (isTauriRuntime()) return invoke('get_study_case', { id: Number(id) });
  return webRequest(`/api/study-cases/${id}`);
}

export async function createStudyCase(payload) {
  if (isTauriRuntime()) return invoke('create_study_case', { payload });
  return webRequest('/api/study-cases', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateStudyCase(id, payload) {
  if (isTauriRuntime()) return invoke('update_study_case', { id: Number(id), payload });
  return webRequest(`/api/study-cases/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteStudyCase(id) {
  if (isTauriRuntime()) return invoke('delete_study_case', { id: Number(id) });
  return webRequest(`/api/study-cases/${id}`, { method: 'DELETE' });
}

export async function uploadImage(payload) {
  if (isTauriRuntime()) return invoke('upload_image', { payload });
  const bytes = Uint8Array.from(atob(payload.base64_data), (c) => c.charCodeAt(0));
  const file = new File([bytes], payload.file_name, { type: payload.mime_type });
  const formData = new FormData();
  formData.append('file', file);
  if (payload.trade_id) {
    formData.append('tradeId', String(payload.trade_id));
  }
  if (payload.description) {
    formData.append('description', payload.description);
  }
  const response = await fetch('/api/upload', { method: 'POST', body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || 'Upload failed');
  return data.image;
}
