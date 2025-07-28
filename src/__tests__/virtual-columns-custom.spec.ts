import { DataSource, Repository } from 'typeorm'
import { CatEntity } from './cat.entity'
import { CatToyEntity } from './cat-toy.entity'
import { CatHomeEntity } from './cat-home.entity'
import { CatHomePillowEntity } from './cat-home-pillow.entity'
import { CatHomePillowBrandEntity } from './cat-home-pillow-brand.entity'
import { ToyShopEntity } from './toy-shop.entity'
import { ToyShopAddressEntity } from './toy-shop-address.entity'
import { paginate, PaginateConfig } from '../paginate'
import { PaginateQuery } from '../decorator'
import { FilterOperator } from '../filter'

describe('Custom Virtual Columns', () => {
    let dataSource: DataSource
    let catRepo: Repository<CatEntity>
    let _cats: CatEntity[]

    beforeAll(async () => {
        dataSource = new DataSource({
            type: 'sqlite',
            database: ':memory:',
            dropSchema: true,
            synchronize: true,
            logging: false, // Disable logging
            entities: [
                CatEntity,
                CatToyEntity,
                CatHomeEntity,
                CatHomePillowEntity,
                CatHomePillowBrandEntity,
                ToyShopEntity,
                ToyShopAddressEntity,
            ],
        })

        await dataSource.initialize()
        catRepo = dataSource.getRepository(CatEntity)

        // Create test data with different colors
        _cats = await catRepo.save([
            catRepo.create({
                name: 'Cat1',
                color: 'P', // Will be mapped to 'Perempuan'
                age: 5,
                cutenessLevel: 'high' as any,
                size: { height: 10, width: 5, length: 8 },
            }),
            catRepo.create({
                name: 'Cat2',
                color: 'L', // Will be mapped to 'Laki-laki'
                age: 3,
                cutenessLevel: 'medium' as any,
                size: { height: 8, width: 4, length: 6 },
            }),
            catRepo.create({
                name: 'Cat3',
                color: 'P', // Will be mapped to 'Perempuan'
                age: 7,
                cutenessLevel: 'high' as any,
                size: { height: 12, width: 6, length: 10 },
            }),
            catRepo.create({
                name: 'Cat4',
                color: 'L', // Will be mapped to 'Laki-laki'
                age: 2,
                cutenessLevel: 'low' as any,
                size: { height: 6, width: 3, length: 4 },
            }),
        ])
    })

    afterAll(async () => {
        await dataSource.destroy()
    })

    it('should sort by custom virtual column (CASE WHEN)', async () => {
        const config: PaginateConfig<CatEntity> = {
            sortableColumns: ['genderLabel' as any],
            virtualColumns: {
                genderLabel: (alias: string) => `CASE WHEN ${alias}.color = 'P' THEN 'Perempuan' ELSE 'Laki-laki' END`,
            },
        }
        const query: PaginateQuery = {
            path: '',
            sortBy: [['genderLabel' as any, 'ASC']],
        }

        const result = await paginate<CatEntity>(query, catRepo, config)

        expect(result.data).toHaveLength(4)
        expect(result.meta.sortBy).toEqual([['genderLabel', 'ASC']])
        // 'Laki-laki' comes before 'Perempuan' alphabetically
        expect(result.data[0].color).toBe('L')
        expect(result.data[1].color).toBe('L')
        expect(result.data[2].color).toBe('P')
        expect(result.data[3].color).toBe('P')
    })

    it('should sort by custom virtual column (CASE WHEN) DESC', async () => {
        const config: PaginateConfig<CatEntity> = {
            sortableColumns: ['genderLabel' as any],
            virtualColumns: {
                genderLabel: "CASE WHEN color = 'P' THEN 'Perempuan' ELSE 'Laki-laki' END",
            },
        }
        const query: PaginateQuery = {
            path: '',
            sortBy: [['genderLabel' as any, 'DESC']],
        }

        const result = await paginate<CatEntity>(query, catRepo, config)

        expect(result.data).toHaveLength(4)
        expect(result.meta.sortBy).toEqual([['genderLabel', 'DESC']])
        // 'Perempuan' comes after 'Laki-laki' alphabetically, so DESC puts it first
        expect(result.data[0].color).toBe('P')
        expect(result.data[1].color).toBe('P')
        expect(result.data[2].color).toBe('L')
        expect(result.data[3].color).toBe('L')
    })

    it('should filter by custom virtual column (CASE WHEN)', async () => {
        const config: PaginateConfig<CatEntity> = {
            sortableColumns: ['id'],
            filterableColumns: {
                genderLabel: [FilterOperator.EQ],
            } as any,
            virtualColumns: {
                genderLabel: "CASE WHEN color = 'P' THEN 'Perempuan' ELSE 'Laki-laki' END",
            },
        }
        const query: PaginateQuery = {
            path: '',
            filter: {
                genderLabel: 'Perempuan',
            } as any,
            sortBy: [['id', 'ASC']],
        }

        const result = await paginate<CatEntity>(query, catRepo, config)

        expect(result.data).toHaveLength(2)
        expect(result.meta.filter).toEqual({ genderLabel: 'Perempuan' })
        // Should only get cats with color = 'P' (which maps to 'Perempuan')
        expect(result.data.every((cat) => cat.color === 'P')).toBe(true)
    })

    it('should search by custom virtual column (CASE WHEN)', async () => {
        const config: PaginateConfig<CatEntity> = {
            sortableColumns: ['id'],
            searchableColumns: ['genderLabel' as any],
            virtualColumns: {
                genderLabel: "CASE WHEN color = 'P' THEN 'Perempuan' ELSE 'Laki-laki' END",
            },
        }
        const query: PaginateQuery = {
            path: '',
            search: 'Perempuan',
        }

        const result = await paginate<CatEntity>(query, catRepo, config)

        expect(result.data).toHaveLength(2)
        expect(result.meta.search).toBe('Perempuan')
        // Should only get cats with color = 'P' (which maps to 'Perempuan')
        expect(result.data.every((cat) => cat.color === 'P')).toBe(true)
    })

    it('should work with functional virtual column definition', async () => {
        const config: PaginateConfig<CatEntity> = {
            sortableColumns: ['ageGroup' as any],
            virtualColumns: {
                ageGroup: (alias: string) => `CASE WHEN ${alias}.age < 5 THEN 'Young' ELSE 'Old' END`,
            },
        }
        const query: PaginateQuery = {
            path: '',
            sortBy: [['ageGroup' as any, 'ASC']],
        }

        const result = await paginate<CatEntity>(query, catRepo, config)

        expect(result.data).toHaveLength(4)
        expect(result.meta.sortBy).toEqual([['ageGroup', 'ASC']])
        // 'Old' comes before 'Young' alphabetically
        // Ages: Cat1=5(Old), Cat2=3(Young), Cat3=7(Old), Cat4=2(Young)
        const firstTwoAges = result.data.slice(0, 2).map((cat) => cat.age)
        const lastTwoAges = result.data.slice(2, 4).map((cat) => cat.age)

        // First two should be 'Old' (age >= 5)
        expect(firstTwoAges.every((age) => age >= 5)).toBe(true)
        // Last two should be 'Young' (age < 5)
        expect(lastTwoAges.every((age) => age < 5)).toBe(true)
    })

    it('should combine custom virtual columns with regular columns in sorting', async () => {
        const config: PaginateConfig<CatEntity> = {
            sortableColumns: ['genderLabel' as any, 'age'],
            virtualColumns: {
                genderLabel: "CASE WHEN color = 'P' THEN 'Perempuan' ELSE 'Laki-laki' END",
            },
        }
        const query: PaginateQuery = {
            path: '',
            sortBy: [
                ['genderLabel' as any, 'ASC'],
                ['age', 'DESC'],
            ],
        }

        const result = await paginate<CatEntity>(query, catRepo, config)

        expect(result.data).toHaveLength(4)
        expect(result.meta.sortBy).toEqual([
            ['genderLabel', 'ASC'],
            ['age', 'DESC'],
        ])

        // First two should be 'Laki-laki' (L), sorted by age DESC
        expect(result.data[0].color).toBe('L')
        expect(result.data[1].color).toBe('L')
        expect(result.data[0].age).toBeGreaterThan(result.data[1].age)

        // Last two should be 'Perempuan' (P), sorted by age DESC
        expect(result.data[2].color).toBe('P')
        expect(result.data[3].color).toBe('P')
        expect(result.data[2].age).toBeGreaterThan(result.data[3].age)
    })
})
