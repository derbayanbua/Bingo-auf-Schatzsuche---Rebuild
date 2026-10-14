// Shared_Inventar: all inventory items OI000..OI083 (icons in the pocket, hand and scenes).
import { defineMovie } from '../lib/api';
import { itemArt } from '../lib/items';

export default defineMovie({
  '*': (m, w, h) => itemArt(m.name, w, h),
});
