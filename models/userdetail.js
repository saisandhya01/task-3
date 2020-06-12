'use strict';
module.exports = (sequelize, DataTypes) => {
  const userdetail = sequelize.define('userdetail', {
    name: DataTypes.STRING,
    username: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    attending: DataTypes.STRING
  }, {});
  userdetail.associate = function(models) {
    // associations can be defined here
  };
  return userdetail;
};