const { Op } = require('sequelize');
const Content = require('../models/Content');
const FamilyClassification = require('../models/FamilyClassification');

class FilterService {
  _buildQuery(filters) {
    const classificationWhere = {};
    if (filters.horror !== undefined) classificationWhere.horror = { [Op.lte]: filters.horror };
    if (filters.violence !== undefined) classificationWhere.violence = { [Op.lte]: filters.violence };
    if (filters.homosexuality !== undefined) classificationWhere.homosexuality = { [Op.lte]: filters.homosexuality };
    if (filters.adult_content !== undefined) classificationWhere.adult_content = { [Op.lte]: filters.adult_content };
    return classificationWhere;
  }

  async filterByHorror(maxLevel) {
    return this._applyFilter({ horror: maxLevel });
  }

  async filterByViolence(maxLevel) {
    return this._applyFilter({ violence: maxLevel });
  }

  async filterByAdultContent(maxLevel) {
    return this._applyFilter({ adult_content: maxLevel });
  }

  async filterByHomosexuality(maxLevel) {
    return this._applyFilter({ homosexuality: maxLevel });
  }

  async filterForChildren() {
    return this._applyFilter({ horror: 2, violence: 2, homosexuality: 2, adult_content: 2 });
  }

  async _applyFilter(filters) {
    const classificationWhere = this._buildQuery(filters);
    return Content.findAll({
      include: [{
        model: FamilyClassification,
        as: 'familyClassification',
        where: classificationWhere,
        required: true,
      }],
    });
  }

  async filterAll(filters) {
    const classificationWhere = this._buildQuery(filters);
    const hasFilters = Object.keys(classificationWhere).length > 0;

    return Content.findAll({
      include: [{
        model: FamilyClassification,
        as: 'familyClassification',
        where: hasFilters ? classificationWhere : undefined,
        required: false,
      }],
    });
  }
}

module.exports = new FilterService();
