export function enableReorder(container, { itemSelector, onReorder }) {
  if (!container) return;
  let draggedId = null;

  container.addEventListener('dragstart', (event) => {
    const item = event.target.closest(itemSelector);
    if (!item) return;
    draggedId = item.dataset.id;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedId || '');
    item.classList.add('is-dragging');
  });

  container.addEventListener('dragend', (event) => {
    const item = event.target.closest(itemSelector);
    item?.classList.remove('is-dragging');
    draggedId = null;
  });

  container.addEventListener('dragover', (event) => {
    if (!draggedId) return;
    event.preventDefault();
  });

  container.addEventListener('drop', (event) => {
    if (!draggedId) return;
    event.preventDefault();
    const items = Array.from(container.querySelectorAll(itemSelector));
    const target = event.target.closest(itemSelector);
    const targetIndex = target ? items.indexOf(target) : items.length - 1;
    if (targetIndex === -1) return;
    onReorder?.({ id: draggedId, index: targetIndex });
  });
}
