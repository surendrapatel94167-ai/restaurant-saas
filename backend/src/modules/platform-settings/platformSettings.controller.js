import PlatformSettings from '../../models/PlatformSettings.model.js';

export async function get(req, res, next) {
  try {
    const settings = await PlatformSettings.getSingleton();
    res.json(settings);
  } catch (err) { next(err); }
}

export async function update(req, res, next) {
  try {
    const {
      monthlyPrice, yearlyPrice, offerActive, offerLabel,
      offerMonthlyPrice, offerYearlyPrice, upiId,
    } = req.body;

    const settings = await PlatformSettings.getSingleton();
    if (monthlyPrice !== undefined) settings.monthlyPrice = monthlyPrice;
    if (yearlyPrice !== undefined) settings.yearlyPrice = yearlyPrice;
    if (offerActive !== undefined) settings.offerActive = offerActive;
    if (offerLabel !== undefined) settings.offerLabel = offerLabel;
    if (offerMonthlyPrice !== undefined) settings.offerMonthlyPrice = offerMonthlyPrice;
    if (offerYearlyPrice !== undefined) settings.offerYearlyPrice = offerYearlyPrice;
    if (upiId !== undefined) settings.upiId = upiId;
    await settings.save();

    res.json(settings);
  } catch (err) { next(err); }
}
