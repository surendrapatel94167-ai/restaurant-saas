import Review from '../../models/Review.model.js';

// Admin: list every review for this tenant (approved + hidden)
export async function listAll(req, res, next) {
  try {
    const reviews = await Review.forTenant(req.tenantId).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) { next(err); }
}

// Admin: show/hide a review on the public review page
export async function toggleApproval(req, res, next) {
  try {
    const review = await Review.findOneForTenant(req.tenantId, { _id: req.params.id });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    review.isApproved = !review.isApproved;
    await review.save();
    res.json(review);
  } catch (err) { next(err); }
}

export async function remove(req, res, next) {
  try {
    await Review.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    res.status(204).send();
  } catch (err) { next(err); }
}
