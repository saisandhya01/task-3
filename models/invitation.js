'use strict';
module.exports = (sequelize, DataTypes) => {
  const invitation = sequelize.define('invitation', {
    head: DataTypes.TEXT,
    body: DataTypes.TEXT,
    footer: DataTypes.TEXT
  }, {});
  invitation.associate = function(models) {
    // associations can be defined here
  };
  return invitation;
};