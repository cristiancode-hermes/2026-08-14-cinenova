import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MoviesService } from './movies.service';

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly movies: MoviesService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('genre') genre?: string,
    @Query('q') q?: string,
  ) {
    return this.movies.findAll({ status, genre, q });
  }

  @Get(':id')
  getDetail(@Param('id', ParseIntPipe) id: number) {
    return this.movies.getDetail(id);
  }
}
