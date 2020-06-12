'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('invitations', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      head: {
        type: Sequelize.TEXT
      },
      body: {
        type: Sequelize.TEXT
      },
      footer: {
        type: Sequelize.TEXT
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('invitations');
  }
};