package com.event.booking.controller;

import com.event.booking.dto.BookingHistoryResponse;
import com.event.booking.dto.ConfirmBookingRequest;
import com.event.booking.model.Booking;
import com.event.booking.security.CustomUserPrincipal;
import com.event.booking.service.BookingService;
import com.event.booking.websocket.EventWebSocketHandler;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/bookings")
public class BookingController {

    private final BookingService bookingService;
    private final EventWebSocketHandler webSocketHandler;

    public BookingController(BookingService bookingService, EventWebSocketHandler webSocketHandler) {
        this.bookingService = bookingService;
        this.webSocketHandler = webSocketHandler;
    }

    @PostMapping("/confirm")
    public ResponseEntity<Booking> confirmBooking(
            @Valid @RequestBody ConfirmBookingRequest request,
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        
        Booking booking = bookingService.confirmBooking(request, principal.getUserId());
        webSocketHandler.broadcastSeatUpdate(request.getEventId());
        return ResponseEntity.ok(booking);
    }

    @GetMapping("/my")
    public ResponseEntity<List<BookingHistoryResponse>> getMyBookings(
            @AuthenticationPrincipal CustomUserPrincipal principal) {
        
        return ResponseEntity.ok(bookingService.getMyBookings(principal.getUserId()));
    }
}
