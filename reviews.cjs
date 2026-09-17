const { ObjectId } = require('mongodb');

const publicReview = review => ({
  id: review._id.toString(), authorName: review.authorName,
  rating: review.rating, comment: review.comment, createdAt: review.createdAt
});

async function createReviews(db, HttpError) {
  const reviews = db.collection('reviews');
  // A retry after a lost network response must not publish a second review.
  await reviews.createIndex({ authorId: 1, requestId: 1 }, { unique: true });
  return {
    async list(url) {
      const params = new URL(url, 'http://localhost').searchParams;
      const before = params.get('before');
      if (before !== null && !/^[a-f0-9]{24}$/.test(before)) throw new HttpError(400, 'Page d’avis invalide.');
      const rows = await reviews.find(before ? { _id: { $lt: new ObjectId(before) } } : {})
        .sort({ _id: -1 }).limit(21).toArray();
      const page = rows.slice(0, 20);
      return { reviews: page.map(publicReview), total: await reviews.countDocuments(),
        nextCursor: rows.length > 20 ? page.at(-1)._id.toString() : null };
    },
    async add(user, data) {
      if (!Number.isInteger(data.rating) || data.rating < 0 || data.rating > 10)
        throw new HttpError(400, 'Choisis une note entière entre 0 et 10.');
      if (typeof data.comment !== 'string' || !data.comment.trim() || data.comment.length > 2000)
        throw new HttpError(400, 'Écris un commentaire de 1 à 2 000 caractères.');
      if (typeof data.requestId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(data.requestId))
        throw new HttpError(400, 'Identifiant de publication invalide. Actualise puis réessaie.');
      const review = { _id: new ObjectId(), authorId: user._id, authorName: user.name,
        rating: data.rating, comment: data.comment.trim(), createdAt: new Date(), requestId: data.requestId };
      try { await reviews.insertOne(review); return { review: publicReview(review), created: true }; }
      catch (error) {
        if (error.code !== 11000) throw error;
        const previous = await reviews.findOne({ authorId: user._id, requestId: data.requestId });
        if (!previous || previous.rating !== review.rating || previous.comment !== review.comment)
          throw new HttpError(409, 'Cette publication existe déjà avec un autre contenu. Actualise la liste.');
        return { review: publicReview(previous), created: false };
      }
    }
  };
}
module.exports = { createReviews };
