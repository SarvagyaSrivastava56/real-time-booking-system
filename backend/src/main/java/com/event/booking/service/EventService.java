package com.event.booking.service;

import com.event.booking.exception.ResourceNotFoundException;
import com.event.booking.model.Event;
import com.event.booking.model.Seat;
import com.event.booking.repository.EventRepository;
import com.event.booking.repository.SeatRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final SeatRepository seatRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String CACHE_PREFIX = "event:";
    private static final long CACHE_TTL_SECONDS = 3600; // 1 hour

    public EventService(EventRepository eventRepository, SeatRepository seatRepository,
                        StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.eventRepository = eventRepository;
        this.seatRepository = seatRepository;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    public Event getEventById(String id) {
        String cacheKey = CACHE_PREFIX + id;
        
        String cachedValue = redisTemplate.opsForValue().get(cacheKey);
        if (cachedValue != null) {
            try {
                return objectMapper.readValue(cachedValue, Event.class);
            } catch (JsonProcessingException e) {
                // Fail silently, fallback to DB
            }
        }

        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with ID: " + id));

        try {
            String jsonValue = objectMapper.writeValueAsString(event);
            redisTemplate.opsForValue().set(cacheKey, jsonValue, Duration.ofSeconds(CACHE_TTL_SECONDS));
        } catch (JsonProcessingException e) {
            // Fail silently
        }

        return event;
    }

    public Event createEvent(Event event) {
        if (event.getId() == null) {
            event.setId(UUID.randomUUID().toString());
        }
        event.setAvailableSeats(event.getTotalSeats());
        Event savedEvent = eventRepository.save(event);

        generateSeatsForEvent(savedEvent);

        return savedEvent;
    }

    public Event updateEvent(String id, Event updatedEvent) {
        Event existingEvent = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found with ID: " + id));

        existingEvent.setTitle(updatedEvent.getTitle());
        existingEvent.setDescription(updatedEvent.getDescription());
        existingEvent.setVenue(updatedEvent.getVenue());
        existingEvent.setDate(updatedEvent.getDate());

        if (updatedEvent.getTotalSeats() != existingEvent.getTotalSeats()) {
            seatRepository.deleteByEventId(id);
            existingEvent.setTotalSeats(updatedEvent.getTotalSeats());
            existingEvent.setAvailableSeats(updatedEvent.getTotalSeats());
            generateSeatsForEvent(existingEvent);
        }

        Event savedEvent = eventRepository.save(existingEvent);

        invalidateCache(id);

        return savedEvent;
    }

    public void deleteEvent(String id) {
        if (!eventRepository.existsById(id)) {
            throw new ResourceNotFoundException("Event not found with ID: " + id);
        }
        eventRepository.deleteById(id);
        seatRepository.deleteByEventId(id);

        invalidateCache(id);
    }

    private void generateSeatsForEvent(Event event) {
        List<Seat> seats = new ArrayList<>();
        int capacity = event.getTotalSeats();
        
        int seatsPerRow = 10;
        for (int i = 1; i <= capacity; i++) {
            char rowLetter = (char) ('A' + (i - 1) / seatsPerRow);
            int seatNum = ((i - 1) % seatsPerRow) + 1;
            String seatCode = "" + rowLetter + seatNum;

            Seat seat = new Seat();
            seat.setId(UUID.randomUUID().toString());
            seat.setEventId(event.getId());
            seat.setSeatNumber(seatCode);
            seat.setStatus("AVAILABLE");
            seats.add(seat);
        }

        seatRepository.saveAll(seats);
    }

    public void invalidateCache(String eventId) {
        String cacheKey = CACHE_PREFIX + eventId;
        redisTemplate.delete(cacheKey);
    }
}
