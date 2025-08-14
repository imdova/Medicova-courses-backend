import {
  Paginate as PPaginate,
  PaginateConfig,
  PaginateQuery,
  Paginated,
} from 'nestjs-paginate';
import { FindOptionsWhere, FindManyOptions } from 'typeorm';

export interface QueryOptions<T> extends PaginateQuery {
  where?: FindOptionsWhere<T>;
  enableCache?: boolean;
  ttl?: any;
}
export interface FindAllOptions<T> extends FindManyOptions<T> {
  enableCache?: boolean;
  ttl?: any;
}
export interface QueryConfig<T> extends PaginateConfig<T> {}

export interface Page<T> extends Paginated<T> {}

export const Paginate = PPaginate;
