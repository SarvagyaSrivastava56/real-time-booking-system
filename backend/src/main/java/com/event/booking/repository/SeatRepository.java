package com.event.booking.repository;

import com.event.booking.model.Seat;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface SeatRepository extends MongoRepository<Seat, String> {
    List<Seat> findByEventId(String eventId);
    Optional<Seat> findByEventIdAndSeatNumber(String eventId, String seatNumber);
    long countByEventId(String eventId);
    void deleteByEventId(String eventId);
}
