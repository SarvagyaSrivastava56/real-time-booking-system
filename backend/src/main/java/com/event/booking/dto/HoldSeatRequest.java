package com.event.booking.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class HoldSeatRequest {
    @NotBlank(message = "Event ID is required")
    private String eventId;

    @NotBlank(message = "Seat number/ID is required")
    private String seatId; // Maps to seatNumber (e.g. A12)
}
