'use strict';
module.exports = (sequelize, DataTypes) => {
  const preference = sequelize.define('preference', {
    eventId: DataTypes.INTEGER,
    setBy: DataTypes.STRING,
    food: DataTypes.STRING,
    noAdults: DataTypes.INTEGER,
    noChildren: DataTypes.INTEGER,
    eventCreatedBy: DataTypes.STRING
  }, {});
  preference.associate = function(models) {
    // associations can be defined here
  };
  return preference;
};