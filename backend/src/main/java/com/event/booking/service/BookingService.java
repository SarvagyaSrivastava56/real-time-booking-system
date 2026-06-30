package com.event.booking.service;

import com.event.booking.dto.AdminStatsResponse;
import com.event.booking.dto.BookingHistoryResponse;
import com.event.booking.dto.ConfirmBookingRequest;
import com.event.booking.exception.InvalidHoldException;
import com.event.booking.exception.ResourceNotFoundException;
import com.event.booking.exception.SeatNotAvailableException;
import com.event.booking.model.Booking;
import com.event.booking.model.Event;
import com.event.booking.model.Seat;
import com.event.booking.repository.BookingRepository;
import com.event.booking.repository.EventRepository;
import com.event.booking.repository.SeatRepository;
import com.event.booking.repository.UserRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final EventRepository eventRepository;
    private final SeatRepository seatRepository;
    private final UserRepository userRepository;
    private final EventService eventService;
    private final StringRedisTemplate redisTemplate;

    private static final String HOLD_PREFIX = "hold:event:";
    private static final double SEAT_PRICE = 50.0;

    public BookingService(BookingRepository bookingRepository, EventRepository eventRepository,
                          SeatRepository seatRepository, UserRepository userRepository,
                          EventService eventService, StringRedisTemplate redisTemplate) {
        this.bookingRepository = bookingRepository;
        this.eventRepository = eventRepository;
        this.seatRepository = seatRepository;
        this.userRepository = userRepository;
        this.eventService = eventService;
        this.redisTemplate = redisTemplate;
    }

    @Transactional
    public Booking confirmBooking(ConfirmBookingRequest request, String userId) {
        String eventId = request.getEventId();
        List<String> seatNumbers = request.getSeatNumbers();

        for (String seatNum : seatNumbers) {
            String holdKey = HOLD_PREFIX + eventId + ":seat:" + seatNum;
            String holder = redisTemplate.opsForValue().get(holdKey);
            
            if (holder == null || !holder.equals(userId)) {
                throw new InvalidHoldException("Hold has expired or is invalid for seat: " + seatNum);
            }
        }

        List<Seat> seatsToBook = new ArrayList<>();
        for (String seatNum : seatNumbers) {
            Seat seat = seatRepository.findByEventIdAndSeatNumber(eventId, seatNum)
                    .orElseThrow(() -> new ResourceNotFoundException("Seat " + seatNum + " not found."));
            
            if ("BOOKED".equalsIgnoreCase(seat.getStatus())) {
                throw new SeatNotAvailableException("Seat " + seatNum + " is already booked.");
            }
            seatsToBook.add(seat);
        }

        for (Seat seat : seatsToBook) {
            seat.setStatus("BOOKED");
            seatRepository.save(seat);
        }

        Booking booking = new Booking();
        booking.setId(UUID.randomUUID().toString());
        booking.setUserId(userId);
        booking.setEventId(eventId);
        booking.setSeatIds(seatsToBook.stream().map(Seat::getId).collect(Collectors.toList()));
        booking.setSeatNumbers(seatNumbers);
        booking.setBookingTime(LocalDateTime.now());
        booking.setTotalPrice(seatNumbers.size() * SEAT_PRICE);
        
        Booking savedBooking = bookingRepository.save(booking);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with ID: " + eventId));
        
        event.setAvailableSeats(Math.max(0, event.getAvailableSeats() - seatNumbers.size()));
        eventRepository.save(event);
        
        eventService.invalidateCache(eventId);

        for (String seatNum : seatNumbers) {
            String holdKey = HOLD_PREFIX + eventId + ":seat:" + seatNum;
            redisTemplate.delete(holdKey);
        }

        return savedBooking;
    }

    public List<BookingHistoryResponse> getMyBookings(String userId) {
        List<Booking> bookings = bookingRepository.findByUserId(userId);
        
        return bookings.stream().map(booking -> {
            Event event;
            try {
                event = eventService.getEventById(booking.getEventId());
            } catch (Exception e) {
                event = new Event(booking.getEventId(), "Deleted Event", "No Description", "N/A", "N/A", 0, 0);
            }
            
            return new BookingHistoryResponse(
                    booking.getId(),
                    booking.getEventId(),
                    event.getTitle(),
                    event.getVenue(),
                    event.getDate(),
                    booking.getSeatNumbers(),
                    booking.getBookingTime()
            );
        }).collect(Collectors.toList());
    }

    public AdminStatsResponse getAdminStats() {
        long eventsCount = eventRepository.count();
        long bookingsCount = bookingRepository.count();
        long usersCount = userRepository.count();
        double totalRevenue = bookingRepository.findAll().stream()
                .mapToDouble(Booking::getTotalPrice)
                .sum();
        
        return new AdminStatsResponse(eventsCount, bookingsCount, usersCount, totalRevenue);
    }
}
