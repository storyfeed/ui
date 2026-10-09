{{-- An app body type, found by its path under the `storyfeed` view namespace. --}}
@props(['body', 'entity' => null])
<p class="sf-shipment m-0 text-base text-foreground [overflow-wrap:anywhere]">{{ $body['carrier'] ?? '' }} · {{ $body['tracking'] ?? '' }}</p>
