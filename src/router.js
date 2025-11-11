const DEFAULT_ROUTE = { name: 'calendar', params: { mode: 'week' } };
const subscribers = new Set();

function getCurrentHash() {
  return typeof window !== 'undefined' ? window.location.hash || '' : '';
}

let currentRoute = parseRouteFromHash(getCurrentHash());

function parseRouteFromHash(hash) {
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const [path, query = ''] = cleanHash.split('?');
  const decodedPath = decodeURIComponent(path || '');

  switch (decodedPath) {
    case '/today':
      return { name: 'today', params: {} };
    case '/upcoming':
      return { name: 'upcoming', params: {} };
    case '/calendar':
      return { name: 'calendar', params: {} };
    case '/done': {
      const params = new URLSearchParams(query);
      const project = params.get('project');
      return { name: 'done', params: { project: project || null } };
    }
    case '/':
    case '':
      return DEFAULT_ROUTE;
    default:
      break;
  }

  if (decodedPath.startsWith('/project/')) {
    const id = decodedPath.replace('/project/', '');
    if (id) {
      return { name: 'project', params: { id } };
    }
  }

  if (decodedPath.startsWith('/tag/')) {
    const name = decodedPath.replace('/tag/', '');
    if (name) {
      return { name: 'tag', params: { name } };
    }
  }

  if (decodedPath === '/search') {
    const searchParams = new URLSearchParams(query);
    const q = searchParams.get('q') || '';
    return { name: 'search', params: { q } };
  }

  return DEFAULT_ROUTE;
}

function notifySubscribers() {
  subscribers.forEach((callback) => callback(currentRoute));
}

function handleHashChange() {
  currentRoute = parseRouteFromHash(getCurrentHash());
  notifySubscribers();
}

export function initRouter(callback) {
  if (callback) {
    subscribers.add(callback);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('load', handleHashChange);
    callback?.(currentRoute);
  } else {
    callback?.(DEFAULT_ROUTE);
  }
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      if (typeof window !== 'undefined') {
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('load', handleHashChange);
      }
    }
  };
}

export function navigate(route) {
  if (!route || !route.name) return;
  let hash = '#/today';
  switch (route.name) {
    case 'today':
    case 'upcoming':
      hash = `#/${route.name}`;
      break;
    case 'done': {
      const project = route.params?.project;
      if (project) {
        const search = new URLSearchParams();
        search.set('project', project);
        hash = `#/done?${search.toString()}`;
      } else {
        hash = '#/done';
      }
      break;
    }
    case 'project':
      if (route.params?.id) hash = `#/project/${encodeURIComponent(route.params.id)}`;
      break;
    case 'tag':
      if (route.params?.name) hash = `#/tag/${encodeURIComponent(route.params.name)}`;
      break;
    case 'search': {
      const q = route.params?.q || '';
      const search = new URLSearchParams();
      if (q) search.set('q', q);
      hash = `#/search${q ? `?${search.toString()}` : ''}`;
      break;
    }
    case 'calendar':
      hash = '#/calendar';
      break;
    default:
      hash = '#/today';
  }

  if (typeof window === 'undefined') return;
  if (window.location.hash === hash) {
    handleHashChange();
  } else {
    window.location.hash = hash;
  }
}

export function getCurrentRoute() {
  return currentRoute;
}
