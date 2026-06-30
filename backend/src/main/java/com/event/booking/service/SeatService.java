package com.event.booking.service;

import com.event.booking.dto.SeatResponse;
import com.event.booking.exception.ResourceNotFoundException;
import com.event.booking.exception.SeatLockedException;
import com.event.booking.exception.SeatNotAvailableException;
import com.event.booking.model.Seat;
import com.event.booking.repository.SeatRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class SeatService {

    private final SeatRepository seatRepository;
    private final StringRedisTemplate redisTemplate;

    private static final String LOCK_PREFIX = "lock:event:";
    private static final String HOLD_PREFIX = "hold:event:";

    public SeatService(SeatRepository seatRepository, StringRedisTemplate redisTemplate) {
        this.seatRepository = seatRepository;
        this.redisTemplate = redisTemplate;
    }

    public List<SeatResponse> getSeatsForEvent(String eventId) {
        List<Seat> seats = seatRepository.findByEventId(eventId);
        
        return seats.stream().map(seat -> {
            String holdKey = HOLD_PREFIX + eventId + ":seat:" + seat.getSeatNumber();
            String heldBy = redisTemplate.opsForValue().get(holdKey);
            
            String status = seat.getStatus();
            Long timeRemaining = null;
            
            if (heldBy != null) {
                status = "HELD";
                timeRemaining = redisTemplate.getExpire(holdKey);
            }
            
            return new SeatResponse(
                    seat.getId(),
                    seat.getEventId(),
                    seat.getSeatNumber(),
                    status,
                    heldBy,
                    timeRemaining
            );
        }).collect(Collectors.toList());
    }

    public void holdSeat(String eventId, String seatNumber, String userId) {
        String lockKey = LOCK_PREFIX + eventId + ":seat:" + seatNumber;
        String holdKey = HOLD_PREFIX + eventId + ":seat:" + seatNumber;

        Boolean lockAcquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "LOCKED", Duration.ofSeconds(10));
        
        if (lockAcquired == null || !lockAcquired) {
            throw new SeatLockedException("Seat " + seatNumber + " is currently being reserved by another user. Please try again.");
        }

        try {
            Seat seat = seatRepository.findByEventIdAndSeatNumber(eventId, seatNumber)
                    .orElseThrow(() -> new ResourceNotFoundException("Seat " + seatNumber + " not found for event " + eventId));
            
            if ("BOOKED".equalsIgnoreCase(seat.getStatus())) {
                throw new SeatNotAvailableException("Seat " + seatNumber + " is already booked.");
            }

            String currentHolder = redisTemplate.opsForValue().get(holdKey);
            if (currentHolder != null) {
                if (currentHolder.equals(userId)) {
                    redisTemplate.expire(holdKey, Duration.ofSeconds(300));
                    return;
                }
                throw new SeatNotAvailableException("Seat " + seatNumber + " is currently held by another customer.");
            }

            redisTemplate.opsForValue().set(holdKey, userId, Duration.ofSeconds(300));

        } finally {
            redisTemplate.delete(lockKey);
        }
    }

    public void releaseSeat(String eventId, String seatNumber, String userId) {
        String holdKey = HOLD_PREFIX + eventId + ":seat:" + seatNumber;
        String currentHolder = redisTemplate.opsForValue().get(holdKey);
        if (currentHolder != null && currentHolder.equals(userId)) {
            redisTemplate.delete(holdKey);
        }
    }
}
