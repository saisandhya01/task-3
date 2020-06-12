'use strict';
module.exports = (sequelize, DataTypes) => {
  const event = sequelize.define('event', {
    name: DataTypes.STRING,
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    eventTime: DataTypes.TIME,
    createdBy: DataTypes.STRING,
    eventType: DataTypes.STRING,
    attendees: DataTypes.STRING,
    acceptedBy: DataTypes.STRING,
    rejectedBy: DataTypes.STRING,
    attendance: DataTypes.STRING
  }, {});
  event.associate = function(models) {
    // associations can be defined here
  };
  return event;
};