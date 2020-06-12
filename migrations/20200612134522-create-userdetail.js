'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('userdetails', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      username: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      },
      password: {
        type: Sequelize.STRING
      },
      attending: {
        type: Sequelize.STRING,
        allowNull:false,
        defaultValue:''
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('userdetails');
  }
};