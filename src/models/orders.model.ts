import { Sequelize, Model, DataTypes } from "sequelize";
const sequelize = new Sequelize("mysql://root:1234@localhost:3306/meta_universe");
export class Orders extends Model {
    public id!: number; // Note that the `null assertion` `!` is required in strict mode.
    public starId!: number;
    public areaId!: number; // for nullable fields
    public renter!: string;
    public status!: number;
    public created!: number;
}

Orders.init(
    {
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
        },
        address: {
            type: new DataTypes.STRING(255),
            allowNull: true,
        },
        amount: {
            type: DataTypes.INTEGER.UNSIGNED,
            field: 'amount'
        },
        status: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
        },
        created: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
    },
    {
        createdAt: false,
        updatedAt: false,
        tableName: "orders",
        sequelize, // passing the `sequelize` instance is required
    }
);
