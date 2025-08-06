import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPricingToServices1754513000000 implements MigrationInterface {
  name = 'AddPricingToServices1754513000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'services',
      new TableColumn({
        name: 'pricing',
        type: 'jsonb',
        isNullable: false,
        default: "'{\"default\": 0}'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('services', 'pricing');
  }
}