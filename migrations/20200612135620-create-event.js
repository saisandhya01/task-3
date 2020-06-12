'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('events', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      startDate: {
        type: Sequelize.DATE
      },
      endDate: {
        type: Sequelize.DATE
      },
      eventTime: {
        type: Sequelize.TIME
      },
      createdBy: {
        type: Sequelize.STRING
      },
      eventType: {
        type: Sequelize.STRING
      },
      attendees: {
        type: Sequelize.STRING
      },
      acceptedBy: {
        type: Sequelize.STRING,
        allowNull:false,
        defaultValue:''
      },
      rejectedBy: {
        type: Sequelize.STRING,
        allowNull:false,
        defaultValue:''
      },
      attendance: {
        type: Sequelize.STRING,
        allowNull:false,
        defaultValue:''
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('events');
  }
};