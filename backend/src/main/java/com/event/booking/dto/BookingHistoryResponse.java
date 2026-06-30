package com.event.booking.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookingHistoryResponse {
    private String bookingId;
    private String eventId;
    private String eventTitle;
    private String venue;
    private String date;
    private List<String> seatNumbers;
    private LocalDateTime bookingTime;
}
