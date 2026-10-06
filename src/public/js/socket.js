
const socket = io();

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const $ = (selector) => document.querySelector(selector);

const servicesBody = $('#services-body');
const availableList = $('#available-list');
const unavailableList = $('#unavailable-list');

function createElement(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}

function findById(container, id) {
  return container.querySelector(`[data-id="${CSS.escape(id)}"]`);
}

function showNotice(text) {
  const notice = $('#notice');
  if (!notice) return;
  notice.textContent = text;
  notice.classList.add('visible');
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => notice.classList.remove('visible'), 4000);
}


function buildRow(service) {
  const row = document.createElement('tr');
  row.dataset.id = service.id;

  const status = document.createElement('td');
  status.append(
    createElement(
      'span',
      service.available ? 'Disponible' : 'No disponible',
      `badge ${service.available ? 'badge-ok' : 'badge-off'}`
    )
  );

  row.append(
    createElement('td', service.name),
    createElement('td', service.description),
    createElement('td', `${service.duration} min`),
    createElement('td', money.format(service.price)),
    createElement('td', service.category),
    status
  );
  return row;
}

function updateTableEmptyState() {
  const message = $('#empty-message');
  if (message) message.hidden = servicesBody.children.length > 0;
}

function upsertRow(service) {
  const row = buildRow(service);
  const existing = findById(servicesBody, service.id);
  if (existing) existing.replaceWith(row);
  else servicesBody.append(row);
  updateTableEmptyState();
}

function removeRow(id) {
  findById(servicesBody, id)?.remove();
  updateTableEmptyState();
}


function buildItem(service) {
  const item = document.createElement('li');
  item.dataset.id = service.id;
  item.append(
    createElement('strong', service.name),
    createElement(
      'span',
      `${service.category} · ${service.duration} min · ${money.format(service.price)}`,
      'meta'
    )
  );
  return item;
}

function updateAvailabilityCounters() {
  $('#available-count').textContent = availableList.children.length;
  $('#unavailable-count').textContent = unavailableList.children.length;
  $('#available-empty').hidden = availableList.children.length > 0;
  $('#unavailable-empty').hidden = unavailableList.children.length > 0;
}

function removeItem(id) {
  findById(availableList, id)?.remove();
  findById(unavailableList, id)?.remove();
}

function upsertItem(service) {
  removeItem(service.id);
  (service.available ? availableList : unavailableList).append(buildItem(service));
  updateAvailabilityCounters();
}


function upsert(service) {
  if (servicesBody) upsertRow(service);
  if (availableList && unavailableList) upsertItem(service);
}

function remove(id) {
  if (servicesBody) removeRow(id);
  if (availableList && unavailableList) {
    removeItem(id);
    updateAvailabilityCounters();
  }
}

socket.on('service:created', (service) => {
  upsert(service);
  showNotice(`Nuevo servicio: ${service.name}`);
});

socket.on('service:updated', (service) => {
  upsert(service);
  showNotice(`Servicio actualizado: ${service.name}`);
});

socket.on('service:deleted', ({ id }) => {
  remove(id);
  showNotice('Se eliminó un servicio');
});