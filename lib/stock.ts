import { Db } from 'mongodb';
import { ObjectId } from 'mongodb';
import { OrderItem } from '@/types';

export async function decrementStock(db: Db, items: OrderItem[]) {
  for (const item of items) {
    try {
      const oid = new ObjectId(item.product.id);
      const result = await db.collection('products').findOneAndUpdate(
        { _id: oid, stock: { $gt: 0 }, stockTracked: true },
        { $inc: { stock: -item.quantity } },
        { returnDocument: 'after' }
      );
      if (result && typeof result.stock === 'number' && result.stock <= 0) {
        await db.collection('products').updateOne(
          { _id: oid },
          { $set: { soldOut: true, stock: 0 } }
        );
      }
    } catch { /* skip items with invalid IDs */ }
  }
}
