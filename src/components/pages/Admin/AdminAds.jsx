import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function AdminAds() {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    // Load ads from localStorage (we'll store them as a separate key)
    const stored = localStorage.getItem('rhema_ads_admin');
    if (stored) {
      try {
        setAds(JSON.parse(stored));
      } catch (e) {}
    } else {
      // Initial default ads (from your AdRotator)
      setAds([
        { id: 1, title: 'All Nations International', description: 'Reaching the neglected globally.', link: 'https://allnations.international/', domain: 'allnations.international', brandColor: '#2ecc71' },
        { id: 2, title: 'Biblical e‑Learning', description: 'Explore faith‑based education.', link: 'https://biblicalelearning.org/', domain: 'biblicalelearning.org', brandColor: '#4a6cf7' },
        // ... add more if needed
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rhema_ads_admin', JSON.stringify(ads));
  }, [ads]);

  const addAd = () => {
    const newAd = {
      id: Date.now(),
      title: 'New Ad',
      description: 'Ad description',
      link: 'https://example.com',
      domain: 'example.com',
      brandColor: '#d4af37',
      logoUrl: null,
      bgImage: null,
      emoji: '📢',
    };
    setAds([...ads, newAd]);
  };

  const deleteAd = (id) => {
    if (!confirm('Delete this ad?')) return;
    setAds(ads.filter(ad => ad.id !== id));
  };

  const editAd = (id, field, value) => {
    setAds(ads.map(ad => ad.id === id ? { ...ad, [field]: value } : ad));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(ads);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setAds(items);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h2 className="text-primary text-2xl font-bold">🖼️ Ad Management</h2>
        <button className="btn !w-auto px-4 py-2 text-sm" onClick={addAd}>+ Add Ad</button>
      </div>

      <div className="bg-surface rounded-xl p-5 border border-[#2a2a2a]">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="ads">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                {ads.map((ad, index) => (
                  <Draggable key={ad.id} draggableId={String(ad.id)} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] flex flex-wrap items-center gap-3"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <input
                            type="text"
                            value={ad.title}
                            onChange={(e) => editAd(ad.id, 'title', e.target.value)}
                            className="w-full p-1 rounded border border-[#333] bg-surface text-text text-sm"
                            placeholder="Title"
                          />
                          <input
                            type="text"
                            value={ad.description}
                            onChange={(e) => editAd(ad.id, 'description', e.target.value)}
                            className="w-full mt-1 p-1 rounded border border-[#333] bg-surface text-text text-sm"
                            placeholder="Description"
                          />
                          <input
                            type="text"
                            value={ad.link}
                            onChange={(e) => editAd(ad.id, 'link', e.target.value)}
                            className="w-full mt-1 p-1 rounded border border-[#333] bg-surface text-text text-sm"
                            placeholder="Link"
                          />
                          <input
                            type="text"
                            value={ad.domain || ''}
                            onChange={(e) => editAd(ad.id, 'domain', e.target.value)}
                            className="w-full mt-1 p-1 rounded border border-[#333] bg-surface text-text text-sm"
                            placeholder="Domain (for favicon)"
                          />
                          <input
                            type="text"
                            value={ad.brandColor || '#d4af37'}
                            onChange={(e) => editAd(ad.id, 'brandColor', e.target.value)}
                            className="w-full mt-1 p-1 rounded border border-[#333] bg-surface text-text text-sm"
                            placeholder="Brand color (hex)"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <button className="text-error hover:text-error/80 text-xs underline" onClick={() => deleteAd(ad.id)}>Delete</button>
                          <span className="text-muted text-xs">Drag to reorder</span>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}