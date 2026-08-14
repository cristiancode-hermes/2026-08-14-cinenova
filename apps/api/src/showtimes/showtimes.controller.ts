import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ShowtimesService } from './showtimes.service';

@ApiTags('showtimes')
@Controller('showtimes')
export class ShowtimesController {
  constructor(private readonly showtimes: ShowtimesService) {}

  @Get()
  findAll(@Query('movieId') movieId?: string, @Query('date') date?: string) {
    return this.showtimes.findAll({
      movieId: movieId ? Number(movieId) : undefined,
      date,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.showtimes.findOne(id).then((s) => this.showtimes.view(s));
  }

  @Get(':id/seats')
  getSeatMap(@Param('id', ParseIntPipe) id: number) {
    return this.showtimes.getSeatMap(id);
  }
}
