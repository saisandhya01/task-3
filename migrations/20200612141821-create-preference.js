'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('preferences', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      eventId: {
        type: Sequelize.INTEGER
      },
      setBy: {
        type: Sequelize.STRING
      },
      food: {
        type: Sequelize.STRING
      },
      noAdults: {
        type: Sequelize.INTEGER
      },
      noChildren: {
        type: Sequelize.INTEGER
      },
      eventCreatedBy: {
        type: Sequelize.STRING
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('preferences');
  }
};